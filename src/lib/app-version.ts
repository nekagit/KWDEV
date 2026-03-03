/**
 * App version: Tauri get_app_version or GET /api/version. Used by copy-app-version and footer.
 */
import { invoke, isTauri } from "@/lib/tauri";

/**
 * Returns the app version string (e.g. "0.1.0").
 * In Tauri desktop: invokes get_app_version (Cargo.toml package version).
 * In browser: fetches GET /api/version and returns data.version.
 */
export async function getAppVersion(): Promise<string> {
  if (isTauri) {
    return invoke<string>("get_app_version", {});
  }
  const res = await fetch("/api/version");
  const data = (await res.json()) as { version?: string };
  return typeof data.version === "string" ? data.version : "0.0.0";
}
