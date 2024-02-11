import { safeListeningHttpServer } from 'create-listening-server';
import express from 'express';
import * as esbuild from 'esbuild';
import path from 'node:path';
import playwright from 'playwright-core';
import webpack from 'webpack';
import { hookPageConsole } from './hook-page-console.js';
import { runBuildWithEsbuild } from './run-build-with-esbuild.js';
import { runBuildWithWebpack } from './run-build-with-webpack.js';
import { require } from './require.js';

export interface IRunTestsOptions {
  preferredPort?: number | undefined;
  launchOptions?: playwright.LaunchOptions | undefined;
  browserContextOptions?: playwright.BrowserContextOptions | undefined;
  /** @deprecated use config options with { kind: 'webpack', config: ... } */
  webpackConfig?: webpack.Configuration | undefined;
  config?: { kind: 'esbuild'; config: esbuild.BuildOptions } | { kind: 'webpack'; config: webpack.Configuration };
  keepOpen?: boolean | undefined;
  colors?: boolean | undefined;
  reporter?: string | undefined;
  ui?: string | undefined;
  timeout?: number | undefined;
  grep?: string;
  iterate?: number;
}

export async function runTests(testFiles: string[], options: IRunTestsOptions = {}): Promise<void> {
  const { preferredPort = 3000, webpackConfig, config, launchOptions, browserContextOptions, keepOpen } = options;
  const closables: Array<() => Promise<void>> = [];

  if (config && webpackConfig) {
    throw new Error(
      'Cannot specify both "webpackConfig" and "config". webpackConfig is deprecated. Use only "config".',
    );
  }
  const finalConfig = webpackConfig ? { kind: 'webpack' as const, config: webpackConfig } : config;

  try {
    const { devMiddleware, staticServePath } = await build(finalConfig, testFiles, options, closables);

    const app = express();
    app.use(devMiddleware);
    app.use('/mocha', express.static(path.dirname(require.resolve('mocha/package.json'))));
    app.use(express.static(staticServePath || process.cwd()));

    const { httpServer, port } = await safeListeningHttpServer(preferredPort, app);
    closables.push(
      () =>
        new Promise<void>((res, rej) => {
          httpServer.close((e) => (e ? rej(e) : res()));
        }),
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

    await page.goto(`http://localhost:${port}/tests.html`);
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

async function build(
  config:
    | { kind: 'esbuild'; config: esbuild.BuildOptions }
    | { kind: 'webpack'; config: webpack.Configuration }
    | undefined,
  testFiles: string[],
  options: IRunTestsOptions,
  closables: (() => Promise<void>)[],
): Promise<{
  devMiddleware: express.RequestHandler;
  staticServePath: string | undefined;
}> {
  if (config?.kind === 'esbuild') {
    console.log(`Bundling using esbuild...`);
    return await runBuildWithEsbuild(config.config, testFiles, options);
  } else if (config?.kind === 'webpack') {
    console.log(`Bundling using webpack...`);
    return await runBuildWithWebpack(config.config, testFiles, options, closables);
  } else {
    throw new Error('No bundler configuration found. Please provide "config" option.');
  }
}

async function waitForTestResults(page: playwright.Page): Promise<number> {
  await page.waitForFunction('mochaStatus.finished', null, { timeout: 0 });
  return page.evaluate<number>('mochaStatus.failed');
}
