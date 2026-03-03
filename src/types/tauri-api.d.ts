/** Ambient declarations for Tauri API (dialog, invoke, getVersion). */
declare module "@tauri-apps/api/dialog" {
  export function open(options?: { directory?: boolean; multiple?: boolean; title?: string }): Promise<string | string[] | null>;
}

declare module "@tauri-apps/api/tauri" {
  export function getVersion(): Promise<string>;
  export function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
}
