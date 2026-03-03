/**
 * Server API URL helper for Tauri builds.
 * In the built Tauri app, relative URLs like /api/server/connect resolve against
 * the WebView asset origin and can trigger "The string did not match the expected pattern".
 * Use this to get a full URL when in Tauri so fetch works.
 */
import { isTauri } from "@/lib/tauri";

const DEFAULT_TAURI_API_BASE = "http://127.0.0.1:4000";

function getApiBase(): string {
  if (typeof window === "undefined") return "";
  if (isTauri) {
    const envBase =
      typeof process !== "undefined" && process.env && (process.env as Record<string, string>).NEXT_PUBLIC_API_BASE;
    return (envBase && envBase.trim()) || DEFAULT_TAURI_API_BASE;
  }
  return window.location.origin;
}

/**
 * Returns the URL to use for a server API path.
 * In Tauri: full URL (e.g. http://127.0.0.1:4000/api/server/connect).
 * In browser: path as-is (e.g. /api/server/connect) so it resolves to current origin.
 */
export function getServerApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (isTauri) {
    return getApiBase() + p;
  }
  return p;
}
