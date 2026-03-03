/**
 * Opens the project folder in the system file manager. Tauri only.
 */
import { invoke, isTauri } from "@/lib/tauri";
import { toast } from "sonner";

/**
 * Opens the project folder (repo path) in the system file manager (Finder on macOS,
 * Explorer on Windows, default file manager on Linux). Tauri only; in browser shows a toast.
 */
export async function openProjectFolderInFileManager(repoPath: string | undefined): Promise<void> {
  const path = repoPath?.trim();
  if (!path) {
    toast.error("No project path set. Add a repo path in project settings.");
    return;
  }
  if (!isTauri) {
    toast.info("Open in folder is available in the desktop app.");
    return;
  }
  try {
    await invoke("open_path_in_file_manager", { path });
    toast.success("Opened in file manager");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Failed to open folder");
  }
}
