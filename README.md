# mocha-play

[![Build Status](https://github.com/wixplosives/mocha-play/workflows/tests/badge.svg)](https://github.com/wixplosives/mocha-play/actions)
[![npm version](https://img.shields.io/npm/v/mocha-play.svg)](https://www.npmjs.com/package/mocha-play)

Run mocha tests in chromium, using webpack and playwright.

## Installation

Install `mocha-play` as a dev dependency:

```
npm i mocha-play --save-dev
```

`mocha-play` expects `mocha`, `@playwright/browser-chromium`, and `webpack` to also be installed in the project.

## Usage

A CLI named `mocha-play` is available after installation:

```
mocha-play [options] <glob ...>
```

For example:

```
mocha-play "test/**/*.spec.js"
mocha-play "test/**/*.spec.ts" -c webpack.config.js
```

## CLI Options

```
-v, --version                       output the version number
-c, --webpack-config <config file>  webpack configuration file to bundle with
-w, --watch                         never-closed, open browser, open-devtools, html-reporter session
-l, --list-files                    list found test files
-t, --timeout <ms>                  mocha timeout in ms (default: 2000)
-p, --port <number>                 port to start the http server with (default: 3000)
--reporter <spec/html/dot/...>      mocha reporter to use (default: "spec")
--ui <bdd|tdd|qunit|exports>        mocha user interface (default: "bdd")
-h, --help                          display help for command
```

### License

MIT
