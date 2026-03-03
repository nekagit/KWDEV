/**
 * Copies the app data directory path to the clipboard. Tauri only.
 */
import { invoke, isTauri } from "@/lib/tauri";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { toast } from "sonner";

/**
 * Copies the app data directory path (where app.db, projects.json, etc. live)
 * to the clipboard. Tauri only; in browser shows a toast.
 */
export async function copyAppDataFolderPath(): Promise<void> {
  if (!isTauri) {
    toast.info("Copy path is available in the desktop app.");
    return;
  }
  try {
    const path = await invoke<string>("get_data_dir");
    const trimmed = path?.trim();
    if (!trimmed) {
      toast.error("Data folder path is not available.");
      return;
    }
    await copyTextToClipboard(trimmed);
  } catch (e) {
    toast.error(
      e instanceof Error ? e.message : "Failed to copy data folder path"
    );
  }
}
