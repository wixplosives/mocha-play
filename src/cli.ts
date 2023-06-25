import { readFile } from 'node:fs/promises';
// import path from 'node:path';
import { parseArgs } from 'node:util';
import { type CliOptions, optionsToHelpContent } from './print-help.js';
// import { executeCommandLine } from './execute-command-line.js';

const options = {
  version: { type: 'boolean', short: 'v', description: 'print version' },
  'webpack-config': {
    type: 'string',
    short: 'c',
    description: 'webpack configuration file to bundle with',
    valueDescription: 'config file',
  },
  watch: {
    type: 'boolean',
    short: 'w',
    description: 'never-closed, open browser, open-devtools, html-reporter session',
  },
  'list-files': {
    type: 'boolean',
    short: 'l',
    description: 'list found test files',
  },
  timeout: {
    type: 'string',
    short: 't',
    default: '2000',
    description: 'mocha timeout in ms',
    valueDescription: 'ms',
    numeric: true,
  },
  port: {
    type: 'string',
    short: 'p',
    default: '3000',
    description: 'port to start the http server with',
    numeric: true,
  },
  grep: {
    type: 'string',
    short: 'p',
    description: 'regular expression to match test title',
    valueDescription: 'regexp',
  },
  iterate: {
    type: 'string',
    short: 'i',
    default: '1',
    description: 'repeat each test a few times, regardless of outcome',
    numeric: true,
  },
  reporter: {
    type: 'string',
    default: 'spec',
    description: 'mocha reporter to use',
    valueDescription: 'spec/html/dot/...',
  },
  ui: {
    type: 'string',
    default: 'bdd',
    description: 'mocha user interface',
    valueDescription: 'bdd|tdd|qunit|exports',
  },
  help: { type: 'boolean', short: 'h', description: 'help menu' },
} satisfies CliOptions;

const { values } = parseArgs({
  allowPositionals: true,
  options,
});

if (values.help) {
  console.log(`Usage: mocha-play [options] <glob ...>\n`);
  console.log(`Run mocha tests in chromium, using webpack and playwright.\n`);
  console.log(`Options:`);
  const simplifiedOptions = optionsToHelpContent(options);
  const maxFlagLength = simplifiedOptions.reduce((acc, { flags: { length } }) => Math.max(acc, length), 0);
  for (const { flags, description } of simplifiedOptions) {
    console.log(`  ${flags.padEnd(maxFlagLength)}  ${description}`);
  }
} else if (values.version) {
  await printVersion();
} else {
  // await executeCommandLine(positionals.map((arg) => path.resolve(arg)));
}

async function printVersion() {
  const packageJsonURL = new URL('../package.json', import.meta.url);
  const packageJsonContents = await readFile(packageJsonURL, 'utf8');
  const ownPackageJson = JSON.parse(packageJsonContents) as { version: string };
  console.log(ownPackageJson.version);
}

// /* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
// import fs from 'fs';
// // import path from 'path';
// import { pathToFileURL, URL } from 'url';
// import { Command } from 'commander';
// import { globSync } from 'glob';
// import type webpack from 'webpack';
// import type playwright from 'playwright-core';
// import { findUpSync } from 'find-up';
// import { runTests } from './run-tests.js';

// const packageJsonPath = new URL('../package.json', import.meta.url);
// const { name, version, description } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
//   name: string;
//   version: string;
//   description: string;
// };

// process.on('unhandledRejection', printErrorAndExit);

// const parseNumber = (value: string) => parseInt(value, 10);

// const program = new Command(name);
// program
//   .version(version, '-v, --version')
//   .description(description)
//   .usage('[options] <glob ...>')
//   .option('-c, --webpack-config <config file>', 'webpack configuration file to bundle with')
//   .option('-w, --watch', 'never-closed, open browser, open-devtools, html-reporter session')
//   .option('-l, --list-files', 'list found test files')
//   .option('-t, --timeout <ms>', 'mocha timeout in ms', parseNumber, 2000)
//   .option('-p, --port <number>', 'port to start the http server with', parseNumber, 3000)
//   .option('-g, --grep <regexp>', 'regular expression to match test title')
//   .option('-i, --iterate <number>', 'repeat each test a few times, regardless of outcome', parseNumber, 1)
//   .option('--reporter <spec/html/dot/...>', 'mocha reporter to use (default: "spec")')
//   .option('--ui <bdd|tdd|qunit|exports>', 'mocha user interface', 'bdd')
//   .action(async (cliOptions) => {
//     const {
//       webpackConfig: webpackConfigPath = findUpSync(['webpack.config.js', 'webpack.config.mjs', 'webpack.config.cjs']),
//       watch,
//       listFiles,
//       reporter,
//       timeout,
//       ui,
//       port: preferredPort,
//       grep,
//       iterate,
//     } = cliOptions;

//     const foundFiles: string[] = [];
//     for (const arg of program.args) {
//       for (const foundFile of globSync(arg, { absolute: true })) {
//         foundFiles.push(path.normalize(foundFile));
//       }
//     }

//     const { length: numFound } = foundFiles;
//     if (numFound === 0) {
//       throw new Error(`Cannot find any test files`);
//     }

//     console.log(`Found ${numFound} test files in ${process.cwd()}`);
//     if (listFiles) {
//       for (const foundFile of foundFiles) {
//         console.log(`- ${foundFile}`);
//       }
//     }

//     const launchOptions: playwright.LaunchOptions | undefined = watch ? { devtools: true } : undefined;

//     const browserContextOptions: playwright.BrowserContextOptions = watch
//       ? { viewport: null }
//       : { viewport: { width: 1024, height: 768 } };

//     // load user's webpack configuration
//     const webpackConfig = webpackConfigPath
//       ? ((await import(pathToFileURL(path.resolve(webpackConfigPath)).href)) as { default: webpack.Configuration })
//           .default
//       : {};

//     if (typeof webpackConfig === 'function') {
//       throw new Error('Webpack configuration file exports a function, which is not yet supported.');
//     }

//     const defaultReporter = watch ? 'html' : 'spec';

//     await runTests(foundFiles, {
//       preferredPort,
//       webpackConfig,
//       launchOptions,
//       browserContextOptions,
//       keepOpen: watch,
//       reporter: reporter || defaultReporter,
//       timeout,
//       ui,
//       grep,
//       iterate,
//     });
//   })
//   .parseAsync()
//   .catch(printErrorAndExit);

// function printErrorAndExit(message: unknown) {
//   console.error(message);
//   process.exitCode = 1;
// }
