import type playwright from 'playwright-core';

/**
 * Hooks the console of a `playwright.Page` to Node's console,
 * printing anything from the page in Node.
 */
export function hookPageConsole(page: playwright.Page): () => void {
  let currentMessage: Promise<void> = Promise.resolve();

  const onConsoleMessage = async (msg: playwright.ConsoleMessage): Promise<void> => {
    const consoleFn = messageTypeToConsoleFn[msg.type()];
    if (!consoleFn) {
      return;
    }

    const { promise, resolve } = deferred();
    const previousMessage = currentMessage;
    currentMessage = promise;
    try {
      const argsHandles = msg.args();
      const msgArgs = argsHandles.length ? await Promise.all(argsHandles.map((arg) => arg.jsonValue())) : [msg.text()];
      await previousMessage;
      consoleFn.apply(console, msgArgs);
    } catch (e) {
      console.error(e);
    } finally {
      resolve();
    }
  };
  page.on('console', onConsoleMessage);
  return () => page.off('console', onConsoleMessage);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const messageTypeToConsoleFn: { [key: string]: (...args: any[]) => void } = {
  log: console.log,
  warning: console.warn,
  error: console.error,
  info: console.info,
  assert: console.assert,
  debug: console.debug,
  trace: console.trace,
  dir: console.dir,
  dirxml: console.dirxml,
  profile: console.profile,
  profileEnd: console.profileEnd,
  startGroup: console.group,
  startGroupCollapsed: console.groupCollapsed,
  endGroup: console.groupEnd,
  table: console.table,
  count: console.count,
  timeEnd: console.timeEnd,

  // we ignore calls to console.clear, as we don't want the page to clear our terminal
  // clear: console.clear
};

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}
