/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { Command } from 'commander';
import { findUpSync } from 'find-up';
import { globSync } from 'glob';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, URL } from 'node:url';
import type playwright from 'playwright-core';
import type webpack from 'webpack';
import { runTests } from './run-tests.js';

const packageJsonPath = new URL('../package.json', import.meta.url);
const { name, version, description } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
  name: string;
  version: string;
  description: string;
};

process.on('unhandledRejection', printErrorAndExit);

const parseNumber = (value: string) => parseInt(value, 10);

const program = new Command(name);
program
  .version(version, '-v, --version')
  .description(description)
  .usage('[options] <glob ...>')
  .option('-c, --webpack-config <config file>', 'webpack configuration file to bundle with')
  .option('-w, --watch', 'never-closed, open browser, open-devtools, html-reporter session')
  .option('-l, --list-files', 'list found test files')
  .option('-t, --timeout <ms>', 'mocha timeout in ms', parseNumber, 2000)
  .option('-p, --port <number>', 'port to start the http server with', parseNumber, 3000)
  .option('-g, --grep <regexp>', 'regular expression to match test title')
  .option('-i, --iterate <number>', 'repeat each test a few times, regardless of outcome', parseNumber, 1)
  .option('--reporter <spec/html/dot/...>', 'mocha reporter to use (default: "spec")')
  .option('--ui <bdd|tdd|qunit|exports>', 'mocha user interface', 'bdd')
  .action(async (cliOptions) => {
    const {
      webpackConfig: webpackConfigPath = findUpSync(['webpack.config.js', 'webpack.config.mjs', 'webpack.config.cjs']),
      watch,
      listFiles,
      reporter,
      timeout,
      ui,
      port: preferredPort,
      grep,
      iterate,
    } = cliOptions;

    const foundFiles: string[] = [];
    for (const arg of program.args) {
      for (const foundFile of globSync(arg, { absolute: true })) {
        foundFiles.push(path.normalize(foundFile));
      }
    }

    const { length: numFound } = foundFiles;
    if (numFound === 0) {
      throw new Error(`Cannot find any test files`);
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
    const webpackConfig = webpackConfigPath
      ? ((await import(pathToFileURL(path.resolve(webpackConfigPath)).href)) as { default: webpack.Configuration })
          .default
      : {};

    if (typeof webpackConfig === 'function') {
      throw new Error('Webpack configuration file exports a function, which is not yet supported.');
    }

    const defaultReporter = watch ? 'html' : 'spec';

    await runTests(foundFiles, {
      preferredPort,
      webpackConfig,
      launchOptions,
      browserContextOptions,
      keepOpen: watch,
      reporter: reporter || defaultReporter,
      timeout,
      ui,
      grep,
      iterate,
    });
  })
  .parseAsync()
  .catch(printErrorAndExit);

function printErrorAndExit(message: unknown) {
  console.error(message);
  process.exitCode = 1;
}
