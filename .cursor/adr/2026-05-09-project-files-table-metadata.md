# ADR: Project Files directory listing — rich table metadata

## Status
Accepted (2026-05-09)

## Context
The Project tab file browser used a flat list with name and size only. Operators wanted more filesystem signal per row without leaving the app.

## Decision
- Extend shared `FileEntry` (`DirListingEntry` in Tauri and `/api/data/projects/[id]/files`) with optional `isSymbolicLink`, `createdAt`, and `permissions` (POSIX `ls`-style where supported).
- Implement listing parity:
  - **Tauri**: derive symlink flag from `DirEntry::file_type()`, timestamps from `Metadata`, permissions via Unix `PermissionsExt` (`mode & 0o777`) with `d`/`l`/`-` prefix.
  - **Next route**: `fs.readdir` with `withFileTypes`, `stat` for targets, `formatUnixPermissionString` from `project-files-display.ts`; Windows uses `"—"` for mode.
- Present **ProjectFilesTab** as a horizontally and vertically scrollable **table**: Name, Kind, Size, Modified, Created, Mode, actions.

## Consequences
- Larger JSON payloads per directory listing (acceptable for single-level reads).
- Created time may be empty on some filesystems (Rust) or approximate (Node `birthtime`).
- Mode column is informational, not an editing surface.
