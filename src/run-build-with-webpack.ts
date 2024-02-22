import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import { type IRunTestsOptions } from './run-tests.js';
import { require } from './require.js';

export async function runBuildWithWebpack(
  webpackConfig: webpack.Configuration,
  testFiles: string[],
  options: IRunTestsOptions,
  closables: (() => Promise<void>)[],
) {
  const compiler = webpack({
    mode: 'development',
    ...webpackConfig,
    entry: {
      ...(await getEntryObject(webpackConfig.entry)),
      tests: testFiles,
    },
    plugins: [
      ...(webpackConfig.plugins ?? []),

      // insert html webpack plugin that targets our own chunks
      new HtmlWebpackPlugin({
        filename: 'tests.html',
        template: require.resolve('../static/index.ejs'),
        chunks: ['tests'],
        templateParameters: {
          TITLE: 'mocha tests',
          MOCHA_UI: options.ui ?? 'bdd',
          MOCHA_COLOR: options.colors ?? true,
          MOCHA_REPORTER: options.reporter ?? 'spec',
          MOCHA_TIMEOUT: options.timeout ?? 2000,
          MOCHA_GREP: options.grep ? `${JSON.stringify(options.grep)}` : 'null',
          MOCHA_ITERATE: options.iterate,
        },
      }),
    ],
    stats: 'errors-warnings',
  });

  const devMiddleware = webpackDevMiddleware(compiler);
  closables.push(
    () =>
      new Promise<void>((res, rej) => {
        devMiddleware.close((e) => (e ? rej(e) : res()));
      }),
  );

  compiler.hooks.done.tap('mocha-play', () => console.log(`Done bundling.`));

  const webpackStats = await new Promise<webpack.Stats>((resolve) => {
    compiler.hooks.done.tap('mocha-play', resolve);
  });

  if (webpackStats.hasErrors()) {
    throw new Error('Errors while bundling.');
  }
  return { devMiddleware, staticServePath: compiler.options.context };
}

/**
 * Helper around handling the multi-type entry field of user webpack config.
 * Converts it to object style, to allow adding additional chunks.
 */
export async function getEntryObject(entry: webpack.Entry = {}): Promise<webpack.EntryObject> {
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
