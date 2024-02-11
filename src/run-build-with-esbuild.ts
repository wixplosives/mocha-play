import express from 'express';
import * as esbuild from 'esbuild';
import { renderFile } from 'ejs';
import mime from 'mime/lite';
import { type IRunTestsOptions } from './run-tests.js';
import { require } from './require.js';

export async function runBuildWithEsbuild(
  esbuildConfig: esbuild.BuildOptions,
  testFiles: string[],
  options: IRunTestsOptions,
): Promise<{ devMiddleware: express.RequestHandler; staticServePath: string | undefined }> {
  const workingDir = esbuildConfig.absWorkingDir ?? process.cwd();
  const config = {
    ...esbuildConfig,
    stdin: {
      contents: testFiles.map((f) => `import ${JSON.stringify(f)};`).join('\n'),
      loader: 'js',
      sourcefile: '@@generated-tests-index.js',
      resolveDir: workingDir,
    },
    format: 'iife',
    sourcemap: 'inline',
    outfile: 'tests.js',
    outbase: '',
    outdir: undefined,
    entryPoints: undefined,
    write: false,
    bundle: true,
    plugins: [
      ...(esbuildConfig.plugins ?? []),
      {
        name: 'html-plugin',
        setup(build) {
          build.onEnd(async ({ outputFiles }) => {
            const testScript = outputFiles?.find((f) => f.path.endsWith('tests.js'));
            if (!testScript) {
              throw new Error('Could not find the output test script.');
            }
            const result = await renderFile(require.resolve('../static/index.ejs'), {
              TITLE: 'mocha tests',
              MOCHA_UI: options.ui ?? 'bdd',
              MOCHA_COLOR: options.colors ?? true,
              MOCHA_REPORTER: options.reporter ?? 'spec',
              MOCHA_TIMEOUT: options.timeout ?? 2000,
              MOCHA_GREP: options.grep ? `${JSON.stringify(options.grep)}` : 'null',
              MOCHA_ITERATE: options.iterate,
              SCRIPTS: [testScript.text],
            });
            outputFiles?.push({ path: '/tests.html', text: result, contents: Buffer.from(result), hash: 'final-html' });
          });
        },
      },
    ],
  } satisfies esbuild.BuildOptions;

  // esbuild does not treat undefined values as missing fields so we need to delete them
  delete config.entryPoints;
  delete config.outdir;

  const buildResult = await esbuild.build(config);
  console.log('Done bundling.');
  // eslint-disable-next-line no-debugger
  const buildFilesMap = new Map<string, { text: string; hash: string }>();
  for (const { path, text, hash } of buildResult.outputFiles) {
    buildFilesMap.set(path, { text, hash });
  }
  // serve the built files
  const devMiddleware: express.RequestHandler = function (req, res, next) {
    const file = buildFilesMap.get(req.path);
    if (file) {
      res.setHeader('Content-Type', mime.getType(req.path) ?? 'text/plain');
      res.setHeader('ETag', file.hash);
      res.setHeader('Cache-Control', 'public, max-age=0');
      res.end(file.text);
    } else if (req.path.endsWith('favicon.ico')) {
      res.end('');
    } else {
      next();
    }
  };

  return { devMiddleware, staticServePath: undefined };
}
