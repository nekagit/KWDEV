/**
 * No-op Tauri invoke/listen/open for environments where Tauri is not available (e.g. Next dev server).
 */
export const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  console.warn(`Tauri 'invoke' API not available in this environment. Command: ${cmd}`);
  return Promise.reject(new Error(`Tauri 'invoke' API not available. Command: ${cmd}`));
};

export const listen = async <T>(event: string, handler: (event: { payload: T }) => void): Promise<() => void> => {
  console.warn(`Tauri 'listen' API not available in this environment. Event: ${event}`);
  return Promise.resolve(() => {});
};

export const open = async (options?: any): Promise<string | string[] | null> => {
  console.warn(`Tauri 'dialog.open' API not available in this environment.`);
  return Promise.resolve(null);
};
