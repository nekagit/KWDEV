# ADR 0007: Project Files tab actions — Rebuild and Put on Desktop

## Status

Accepted.

## Context

Users frequently need to produce a desktop build and/or copy the latest build artifact to their Desktop while working inside a project's **Project → Project Files** area. Previously, these actions were not surfaced in the Project Files view, requiring manual terminal commands.

## Decision

- Add two actions to **Project → Project Files** (in `ProjectProjectTab`):
  - **Rebuild**: runs `npm run build:desktop` via the existing Tauri command `run_build_desktop`.
  - **Put on Desktop**: runs `node script/tauri/copy-build-to-desktop.mjs` via a new Tauri command `run_copy_build_to_desktop`.

Both actions are **desktop-app only** (Tauri) and will be disabled in the browser.

## Consequences

- Desktop build workflows are reachable directly from the Project Files view.
- The copy-to-desktop behavior stays centralized in the existing Node script (`copy-build-to-desktop.mjs`), while the UI triggers it through a single Tauri command.

