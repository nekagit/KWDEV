/**
 * Download app info as JSON file. Tauri only.
 */
import { toast } from "sonner";
import { invoke, isTauri } from "@/lib/tauri";
import type { CopyAppInfoParams } from "@/lib/copy-app-info";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import {
  filenameTimestamp,
  triggerFileDownload,
} from "@/lib/download-helpers";

export type AppInfoJsonPayload = {
  exportedAt: string;
  version: string;
  theme: string;
  mode: string;
  dataFolder: string;
};

/**
 * Build a JSON-serializable payload for app info (version, theme, mode, data folder).
 */
export function buildAppInfoJsonPayload(params: {
  version: string;
  theme: string;
  mode: string;
  dataFolder: string;
}): AppInfoJsonPayload {
  const exportedAt = new Date().toISOString();
  return {
    exportedAt,
    version: (params.version ?? "").trim() || "—",
    theme: (params.theme ?? "").trim() || "—",
    mode: (params.mode ?? "").trim() || "—",
    dataFolder: (params.dataFolder ?? "").trim() || "—",
  };
}

/**
 * Download app info as a JSON file.
 * Resolves data folder (Tauri) and mode, then builds payload and triggers download.
 * Filename: app-info-{timestamp}.json
 */
export async function downloadAppInfoAsJson(
  params: CopyAppInfoParams
): Promise<void> {
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
  const payload = buildAppInfoJsonPayload({
    version,
    theme,
    dataFolder,
    mode,
  });
  const content = JSON.stringify(payload, null, 2);
  const filename = `app-info-${filenameTimestamp()}.json`;
  triggerFileDownload(content, filename, "application/json;charset=utf-8");
  toast.success("App info exported as JSON");
}

/**
 * Copy app info as pretty-printed JSON to the clipboard.
 * Resolves data folder (Tauri) and mode, then builds payload and copies.
 */
export async function copyAppInfoAsJsonToClipboard(
  params: CopyAppInfoParams
): Promise<void> {
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
  const payload = buildAppInfoJsonPayload({
    version,
    theme,
    dataFolder,
    mode,
  });
  const content = JSON.stringify(payload, null, 2);
  const ok = await copyTextToClipboard(content);
  if (ok) {
    toast.success("App info copied as JSON");
  } else {
    toast.error("Failed to copy to clipboard");
  }
}
