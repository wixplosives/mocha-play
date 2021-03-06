import { join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { expect } from 'chai';
import stripAnsi from 'strip-ansi';

const cliPath = require.resolve('../bin/mocha-play.js');
const fixturesRoot = join(__dirname, 'fixtures');

const runMochaPlay = (options: { args: string[]; fixture?: string }) => {
  const spawnResult = spawnSync('node', [cliPath, '-l', ...options.args.map((arg) => `"${arg}"`)], {
    cwd: resolve(fixturesRoot, options.fixture || '.'),
    shell: true,
    encoding: 'utf8',
  });
  spawnResult.stdout = stripAnsi(spawnResult.stdout);
  spawnResult.stderr = stripAnsi(spawnResult.stderr);
  return spawnResult;
};

describe('mocha-play', function () {
  this.timeout(20_000);

  it('runs test files specified directly', () => {
    const { stdout, status } = runMochaPlay({ args: ['./sample.spec.js'] });

    expect(stdout).to.include('Found 1 test files');
    expect(stdout).to.include('2 passing');
    expect(status).to.equal(0);
  });

  it('runs test files specified using globs', () => {
    const { stdout, status } = runMochaPlay({ args: ['./**/*.spec.js'] });

    expect(stdout).to.include('Found 2 test files');
    expect(stdout).to.include('3 passing');
    expect(status).to.equal(0);
  });

  it('fails when there are test errors', () => {
    const { stdout, stderr, status } = runMochaPlay({ args: ['./should-fail.unit.js'] });

    expect(stdout).to.include('some error message');
    expect(stderr).to.include('1 tests failed');
    expect(status).to.not.equal(0);
  });

  it('fails if not finding test files', () => {
    const { stderr, status } = runMochaPlay({ args: ['./*.missing.js'] });

    expect(stderr).to.include('Cannot find any test files');
    expect(status).to.not.equal(0);
  });

  it('automatically finds and uses webpack.config.js', () => {
    const { stdout, status } = runMochaPlay({
      args: ['./typescript-file.ts'],
      fixture: 'with-config',
    });

    expect(stdout).to.include('Found 1 test files');
    expect(stdout).to.include('1 passing');
    expect(status).to.equal(0);
  });

  it('allows bundling using custom webpack configuration', () => {
    const { stdout, status } = runMochaPlay({
      args: ['./typescript-file.ts', '-c', './my.config.js'],
      fixture: 'custom-config',
    });

    expect(stdout).to.include('Found 1 test files');
    expect(stdout).to.include('1 passing');
    expect(status).to.equal(0);
  });

  it('fails when there are bundling errors', () => {
    const { stdout, status } = runMochaPlay({ args: ['./typescript-file.ts'], fixture: 'custom-config' });

    expect(stdout).to.include('Found 1 test files');
    expect(stdout).to.include('ERROR in ./typescript-file.ts');
    expect(stdout).to.include('Module parse failed: Unexpected token');
    expect(stdout).to.include('You may need an appropriate loader to handle this file type');
    expect(status).to.equal(1);
  });

  it('fails when the page has an error', () => {
    const { stdout, stderr, status } = runMochaPlay({ args: ['./page-error-throw.js'] });

    expect(stdout).to.include('Found 1 test files');
    expect(stderr).to.include('Error: outside test');
    expect(status).to.equal(1);
  });

  it('prints console messages in correct order', () => {
    const { stdout, status } = runMochaPlay({ args: ['./printer.js'] });

    expect(stdout).to.include('###before###');
    expect(stdout).to.include('###after###');
    expect(stdout.indexOf('###before###'), 'order of messages').to.be.lessThan(stdout.indexOf('###after###'));
    expect(status).to.equal(0);
  });

  it('prints errors printed using console.log', () => {
    const { stdout, status } = runMochaPlay({ args: ['./page-error-console.js'] });

    expect(stdout).to.include('Found 1 test files');
    expect(stdout).to.include('Error: printed to log');
    expect(status).to.equal(0);
  });

  it('serves assets in working directory', () => {
    const { stdout, status } = runMochaPlay({ fixture: 'asset', args: ['./asset.test.js'] });

    expect(stdout).to.include('Found 1 test files');
    expect(stdout).to.include('1 passing');
    expect(status).to.equal(0);
  });
});
