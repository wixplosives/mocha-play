import { fileURLToPath, URL } from 'url';
import express from 'express';
import playwright from 'playwright-core';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { safeListeningHttpServer } from 'create-listening-server';
import { hookPageConsole } from './hook-page-console.js';

const mochaSetupPath = fileURLToPath(new URL('../static/mocha-setup.js', import.meta.url));

export interface IRunTestsOptions {
  preferredPort?: number | undefined;
  launchOptions?: playwright.LaunchOptions | undefined;
  browserContextOptions?: playwright.BrowserContextOptions | undefined;
  webpackConfig?: webpack.Configuration | undefined;
  keepOpen?: boolean | undefined;
  colors?: boolean | undefined;
  reporter?: string | undefined;
  ui?: string | undefined;
  timeout?: number | undefined;
}

export async function runTests(testFiles: string[], options: IRunTestsOptions = {}): Promise<void> {
  const { preferredPort = 3000, webpackConfig = {}, launchOptions, browserContextOptions, keepOpen } = options;
  const closables: Array<() => Promise<void>> = [];

  try {
    console.log(`Bundling using webpack...`);
    const compiler = webpack({
      mode: 'development',
      ...webpackConfig,
      entry: {
        ...(await getEntryObject(webpackConfig.entry)),
        mocha: mochaSetupPath,
        units: testFiles,
      },
      plugins: createPluginsConfig(webpackConfig.plugins, options),
      stats: 'errors-warnings',
    });

    const devMiddleware = webpackDevMiddleware(compiler);
    closables.push(
      () =>
        new Promise<void>((res, rej) => {
          devMiddleware.close((e) => (e ? rej(e) : res()));
        })
    );

    compiler.hooks.done.tap('mocha-play', () => console.log(`Done bundling.`));

    const webpackStats = await new Promise<webpack.Stats>((resolve) => {
      compiler.hooks.done.tap('mocha-play', resolve);
    });

    if (webpackStats.hasErrors()) {
      throw new Error('Errors while bundling.');
    }
    const app = express();
    app.use(devMiddleware);
    app.use(express.static(compiler.options.context || process.cwd()));

    const { httpServer, port } = await safeListeningHttpServer(preferredPort, app);
    closables.push(
      () =>
        new Promise<void>((res, rej) => {
          httpServer.close((e) => (e ? rej(e) : res()));
        })
    );
    console.log(`HTTP server is listening on port ${port}`);

    const browser = await playwright.chromium.launch(launchOptions);
    closables.push(() => browser.close());
    const context = await browser.newContext(browserContextOptions);
    const page = await context.newPage();

    hookPageConsole(page);

    page.on('dialog', (dialog) => {
      dialog.dismiss().catch((e) => console.error(e));
    });

    const failsOnPageError = new Promise((_resolve, reject) => {
      page.once('pageerror', reject);
      page.once('crash', reject);
    });

    await page.goto(`http://localhost:${port}/mocha.html`);

    const failedCount = await Promise.race([waitForTestResults(page), failsOnPageError]);

    if (failedCount) {
      throw new Error(`${failedCount as number} tests failed!`);
    }
  } finally {
    if (!keepOpen) {
      await Promise.all(closables.map((close) => close()));
      closables.length = 0;
    }
  }
}

function createPluginsConfig(
  existingPlugins: webpack.WebpackPluginInstance[] = [],
  options: IRunTestsOptions
): webpack.WebpackPluginInstance[] {
  return [
    ...existingPlugins,

    // insert html webpack plugin that targets our own chunks
    new HtmlWebpackPlugin({ filename: 'mocha.html', title: 'mocha tests', chunks: ['mocha', 'units'] }),

    // inject options to mocha-setup.js (in "static" folder)
    new webpack.DefinePlugin({
      'process.env': {
        MOCHA_UI: JSON.stringify(options.ui),
        MOCHA_COLORS: JSON.stringify(options.colors),
        MOCHA_REPORTER: JSON.stringify(options.reporter),
        MOCHA_TIMEOUT: JSON.stringify(options.timeout),
      },
    }),
  ];
}

async function waitForTestResults(page: playwright.Page): Promise<number> {
  await page.waitForFunction('mochaStatus.finished', null, { timeout: 0 });
  return page.evaluate<number>('mochaStatus.failed');
}

/**
 * Helper around handling the multi-type entry field of user webpack config.
 * Converts it to object style, to allow adding additional chunks.
 */
async function getEntryObject(entry: webpack.Entry = {}): Promise<webpack.EntryObject> {
  if (typeof entry === 'function') {
    entry = await entry();
  }

  if (typeof entry === 'string' || Array.isArray(entry)) {
    return { main: entry };
  } else if (typeof entry === 'object') {
    return entry;
  }
  throw new Error(`Unsupported "entry" field type (${typeof entry}) in webpack configuration.`);
}
