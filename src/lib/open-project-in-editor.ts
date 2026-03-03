/**
 * Opens the project in Cursor or VS Code. Tauri only.
 */
import { invoke, isTauri } from "@/lib/tauri";
import { toast } from "sonner";

export type EditorKind = "cursor" | "vscode";

/**
 * Opens the project at the given path in Cursor or VS Code.
 * Tauri only; in browser shows a toast that it is available in the desktop app.
 */
export async function openProjectInEditor(
  repoPath: string | undefined,
  editor: EditorKind
): Promise<void> {
  const path = repoPath?.trim();
  if (!path) {
    toast.error("No project path set. Add a repo path in project settings.");
    return;
  }
  if (!isTauri) {
    toast.info("Open in editor is available in the desktop app.");
    return;
  }
  const label = editor === "cursor" ? "Cursor" : "VS Code";
  try {
    await invoke("open_project_in_editor", {
      projectPath: path,
      editor: editor === "vscode" ? "vscode" : "cursor",
    });
    toast.success(`Opened in ${label}`);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : `Failed to open in ${label}`);
  }
}
