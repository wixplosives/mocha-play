describe('env', () => {
  it('passes the env to the test runner html', () => {
      if (env.mocha_env_test !== 'true') {
        throw new Error(`window.MOCHA_ENV.mocha_env_test is not true`)
      }
  });
});
