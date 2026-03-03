// This is a placeholder for Tauri command type definitions.
// A more complete solution would involve generating these types automatically.
// For now, it serves to resolve TS2307 'Cannot find module' errors.
declare module '../../src-tauri/src/lib' {
  // Define your Tauri command types here if known
  // For example:
  // export function greet(name: string): Promise<string>;
}

declare module '@tauri-apps/api/tauri' {
  export function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
}

export {};
