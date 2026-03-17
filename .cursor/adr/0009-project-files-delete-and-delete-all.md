# ADR 0009: Project Files — per-file Delete and Delete all

## Status

Accepted.

## Context

Users need to remove files from the project’s `.cursor` (and subfolders) from the **Project → Project Files** view. Previously there was no way to delete a file or clear the current folder from the UI.

## Decision

- **Backend**
  - Add a delete-file capability used by both Tauri and the Next.js API:
    - **Tauri**: new command `delete_file_under_root(root, relative_path)` — deletes a single file under the project root; only files, not directories.
    - **Next.js**: `DELETE /api/data/projects/[id]/file?path=...` with the same path/security rules as the existing GET/POST file route.
  - In `api-projects.ts`, add `deleteProjectFile(projectId, relativePath, repoPath?)` that calls the Tauri command when in Tauri (with `repoPath`) or the DELETE API in the browser.

- **UI**
  - **Per-file delete**: In `ProjectFilesTab`, add a **Delete** item to the existing 3-dot menu for each file (not for directories). Confirmation via `window.confirm` before delete; toast on success/failure; refresh list after delete.
  - **Delete all**: In **Project → Project Files** tab (in `ProjectProjectTab`), add a **Delete all** button next to **Rebuild**. It deletes all **files** (not directories) in the currently listed folder. Confirmation required; disabled when there are no files. Uses `onStateChange` from `ProjectFilesTab` so the parent knows the current path and file list.

## Consequences

- Users can delete individual files from the project-files browser and bulk-delete all files in the current folder.
- Delete is restricted to files; directories are not deleted to avoid accidental removal of whole trees.
- Same path normalization and security checks as existing file read/write (project repo path, no path escape).
