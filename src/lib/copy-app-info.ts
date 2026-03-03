/**
 * Copies app info (version, data path, etc.) as text or JSON to the clipboard.
 */
import { invoke, isTauri } from "@/lib/tauri";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

export type CopyAppInfoParams = {
  version: string;
  theme: string;
};

/**
 * Builds a short block of app environment info (version, theme, mode, data folder)
 * and copies it to the clipboard. For support requests and bug reports.
 * Uses get_data_dir in Tauri; in browser, data folder is "—".
 */
export async function copyAppInfoToClipboard(
  params: CopyAppInfoParams
): Promise<boolean> {
  const { version, theme } = params;
  let dataFolder = "—";
  if (isTauri) {
    try {
      dataFolder = await invoke<string>("get_data_dir", {});
    } catch {
      dataFolder = "—";
    }
  }
  const mode = isTauri ? "Tauri" : "Browser";
  const lines = [
    "KWCode app info",
    `Version: ${version.trim() || "—"}`,
    `Theme: ${theme.trim() || "—"}`,
    `Mode: ${mode}`,
    `Data folder: ${dataFolder}`,
  ];
  const text = lines.join("\n");
  return copyTextToClipboard(text);
}
