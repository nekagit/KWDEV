/**
 * Opens the app data directory in the system file manager. Tauri only.
 */
import { invoke, isTauri } from "@/lib/tauri";
import { toast } from "sonner";

/**
 * Opens the app data directory (where app.db, projects.json, prompts, etc. live)
 * in the system file manager (Finder on macOS, Explorer on Windows, default file
 * manager on Linux). Tauri only; in browser shows a toast.
 * Reuses get_data_dir and open_path_in_file_manager (ADR 0188).
 */
export async function openAppDataFolderInFileManager(): Promise<void> {
  if (!isTauri) {
    toast.info("Open data folder is available in the desktop app.");
    return;
  }
  try {
    const dataDir = await invoke<string>("get_data_dir");
    const path = dataDir?.trim();
    if (!path) {
      toast.error("Data directory path is not available.");
      return;
    }
    await invoke("open_path_in_file_manager", { path });
    toast.success("Opened data folder in file manager");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Failed to open data folder");
  }
}
