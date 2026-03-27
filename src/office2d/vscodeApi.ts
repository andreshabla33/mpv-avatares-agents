export const vscode: { postMessage(msg: unknown): void } = { postMessage: (msg: unknown) => console.log('[vscode.postMessage]', msg) };
