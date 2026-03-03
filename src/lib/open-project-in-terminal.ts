/**
 * Opens the project path in the system terminal. Tauri only.
 */
import { invoke, isTauri } from "@/lib/tauri";
import { toast } from "sonner";

/**
 * Opens one system terminal (Terminal.app on macOS) with the project path as the
 * current working directory. Tauri only; on non-macOS the backend returns an error.
 * In browser shows a toast that it is available in the desktop app.
 */
export async function openProjectInSystemTerminal(
  repoPath: string | undefined
): Promise<void> {
  const path = repoPath?.trim();
  if (!path) {
    toast.error("No project path set. Add a repo path in project settings.");
    return;
  }
  if (!isTauri) {
    toast.info("Open in terminal is available in the desktop app.");
    return;
  }
  try {
    await invoke("open_project_in_system_terminal", { projectPath: path });
    toast.success("Opened in Terminal");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Failed to open terminal");
  }
}
