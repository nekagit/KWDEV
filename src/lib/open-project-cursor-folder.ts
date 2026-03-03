/**
 * Opens the project .cursor folder in the system file manager. Tauri only.
 */
import { invoke, isTauri } from "@/lib/tauri";
import { toast } from "sonner";

/**
 * Opens the project's .cursor folder (repoPath/.cursor) in the system file manager.
 * Reuses open_path_in_file_manager (ADR 0128). If .cursor does not exist, the backend
 * returns an error and we show it. Tauri only; in browser shows a toast.
 */
export async function openProjectCursorFolderInFileManager(
  repoPath: string | undefined
): Promise<void> {
  const base = repoPath?.trim();
  if (!base) {
    toast.error("No project path set. Add a repo path in project settings.");
    return;
  }
  if (!isTauri) {
    toast.info("Open .cursor folder is available in the desktop app.");
    return;
  }
  const cursorPath = base.replace(/[/\\]+$/, "") + "/.cursor";
  try {
    await invoke("open_path_in_file_manager", { path: cursorPath });
    toast.success("Opened .cursor folder in file manager");
  } catch (e) {
    toast.error(
      e instanceof Error ? e.message : "Failed to open .cursor folder (path may not exist)"
    );
  }
}
