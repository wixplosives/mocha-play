/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import path from 'path';
import { Command } from 'commander';
import glob from 'glob';
import type webpack from 'webpack';
import type playwright from 'playwright-core';
import chalk from 'chalk';
import findUp from 'find-up';
import { runTests } from './run-tests';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { name, version, description } = require('../package.json') as {
  name: string;
  version: string;
  description: string;
};

process.on('unhandledRejection', printErrorAndExit);

const parseNumber = (value: string) => parseInt(value, 10);

const program = new Command(name);
const cliOptions = program
  .version(version, '-v, --version')
  .description(description)
  .usage('[options] <glob ...>')
  .option('-c, --webpack-config <config file>', 'webpack configuration file to bundle with')
  .option('-w, --watch', 'never-closed, open browser, open-devtools, html-reporter session')
  .option('-l, --list-files', 'list found test files')
  .option('-t, --timeout <ms>', 'mocha timeout in ms', parseNumber, 2000)
  .option('-p, --port <number>', 'port to start the http server with', parseNumber, 3000)
  .option('--reporter <spec/html/dot/...>', 'mocha reporter to use (default: "spec")')
  .option('--ui <bdd|tdd|qunit|exports>', 'mocha user interface', 'bdd')
  .parse()
  .opts();

const {
  webpackConfig: webpackConfigPath = findUp.sync('webpack.config.js'),
  watch,
  listFiles,
  reporter,
  timeout,
  ui,
  port: preferredPort,
} = cliOptions;

const foundFiles: string[] = [];
for (const arg of program.args) {
  for (const foundFile of glob.sync(arg, { absolute: true })) {
    foundFiles.push(foundFile);
  }
}

const { length: numFound } = foundFiles;
if (numFound === 0) {
  printErrorAndExit(chalk.red(`Cannot find any test files`));
}

console.log(`Found ${numFound} test files in ${process.cwd()}`);
if (listFiles) {
  for (const foundFile of foundFiles) {
    console.log(`- ${foundFile}`);
  }
}

const launchOptions: playwright.LaunchOptions | undefined = watch ? { devtools: true } : undefined;

const browserContextOptions: playwright.BrowserContextOptions = watch
  ? { viewport: null }
  : { viewport: { width: 1024, height: 768 } };

// load user's webpack configuration
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpackConfig = webpackConfigPath ? (require(path.resolve(webpackConfigPath)) as webpack.Configuration) : {};
if (typeof webpackConfig === 'function') {
  printErrorAndExit(chalk.red('Webpack configuration file exports a function, which is not yet supported.'));
}

const defaultReporter = watch ? 'html' : 'spec';

runTests(foundFiles, {
  preferredPort,
  webpackConfig,
  launchOptions,
  browserContextOptions,
  keepOpen: watch,
  reporter: reporter || defaultReporter,
  timeout,
  ui,
}).catch(printErrorAndExit);

function printErrorAndExit(message: unknown) {
  console.error(message);
  if (!watch) {
    // keep process open in watch mode
    process.exit(1);
  }
}
