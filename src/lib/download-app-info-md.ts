/**
 * Download app info as Markdown file. Tauri only.
 */
import { toast } from "sonner";
import { invoke, isTauri } from "@/lib/tauri";
import type { CopyAppInfoParams } from "@/lib/copy-app-info";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import {
  filenameTimestamp,
  triggerFileDownload,
} from "@/lib/download-helpers";

export type AppInfoMarkdownParams = {
  version: string;
  theme: string;
  dataFolder: string;
  mode: string;
};

/**
 * Build a Markdown string for app info (version, theme, mode, data folder).
 * Format: "# KWCode app info", Exported at, then Version/Theme/Mode/Data folder.
 */
export function buildAppInfoMarkdown(params: AppInfoMarkdownParams): string {
  const { version, theme, dataFolder, mode } = params;
  const exportedAt = new Date().toISOString();
  const lines = [
    "# KWCode app info",
    "",
    `Exported at ${exportedAt}.`,
    "",
    "---",
    "",
    `- **Version:** ${(version ?? "").trim() || "—"}`,
    `- **Theme:** ${(theme ?? "").trim() || "—"}`,
    `- **Mode:** ${(mode ?? "").trim() || "—"}`,
    `- **Data folder:** ${(dataFolder ?? "").trim() || "—"}`,
    "",
  ];
  return lines.join("\n");
}

/**
 * Download app info as a Markdown file.
 * Resolves data folder (Tauri) and mode, then builds markdown and triggers download.
 * Filename: app-info-{timestamp}.md
 */
export async function downloadAppInfoAsMarkdown(
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
  const markdown = buildAppInfoMarkdown({
    version,
    theme,
    dataFolder,
    mode,
  });
  const filename = `app-info-${filenameTimestamp()}.md`;
  triggerFileDownload(markdown, filename, "text/markdown;charset=utf-8");
  toast.success("App info exported as Markdown");
}

/**
 * Copy app info to the clipboard as Markdown.
 * Same content as downloadAppInfoAsMarkdown (version, theme, mode, data folder).
 * Returns a Promise that resolves to true if copy succeeded, false otherwise.
 */
export async function copyAppInfoAsMarkdownToClipboard(
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
  const markdown = buildAppInfoMarkdown({
    version,
    theme,
    dataFolder,
    mode,
  });
  const ok = await copyTextToClipboard(markdown);
  if (ok) {
    toast.success("App info copied as Markdown");
  } else {
    toast.error("Failed to copy to clipboard");
  }
  return ok;
}
