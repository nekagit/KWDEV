# ADR 0002: Script folder structure and cleanup

## Status

Accepted.

## Context

The `script/` folder contained 34 files at the repo root (plus existing `worker/` and `ai-bots/` subfolders), mixing Tauri build, Tailwind extraction, codemods, setup, and data helpers. References lived in package.json, tauri.conf.json, tailwind-classes.json, an API route, and Rust. Two scripts referenced by Rust (`run_prompts_all_projects.sh`, `run_analysis_single_project.sh`) were not present in the repo, causing potential runtime failures when those features were used.

## Decision

1. **Subfolders** — Reorganize into:
   - **script/tauri/** — Tauri dev/build scripts (wait-dev-server, build-for-tauri, tauri-with-local-target, tauri-build, copy-build-to-desktop).
   - **script/tailwind/** — Tailwind extraction and codemods (extract-tailwind-classes, extract-tailwind-molecules, codemod-molecules-use-json-classes, enhance_tailwind_classes).
   - **script/scaffold/** — scaffold-cursor-md.
   - **script/codemods/** — One-off refactors (add-file-comments, fix-imports, fix-imports-atomic, restructure-components, enforce-atomic).
   - **script/setup/** — setup-documentation, initialize-project, install-deps-and-build-desktop.
   - **script/data/** — generate-milestones, create-tickets, clear-all-tickets.
   - **script/run/** — run-claude-from-home, claude binary.
   - **script/worker/** and **script/ai-bots/** — unchanged (already correct and heavily referenced).

2. **Reference updates** — Update package.json script paths, tauri.conf.json `beforeBuildCommand`, tailwind-classes.json `_meta.script`, and in-script paths (repo root resolution and self-references) so all commands resolve correctly after the move. No change to install-runner API (still reads `script/ai-bots/`) or Rust `script/worker/` paths.

3. **Unused scripts** — Do not delete; move into the subfolders above. Codemods and setup scripts remain available for manual use.

4. **Missing Rust scripts** — Add an existence check for `script_path()` (run_prompts_all_projects.sh) so that when the file is missing, Rust returns a clear error instead of failing at spawn. `analysis_script_path()` already had such a check. The two scripts remain not in the repo; no stubs or path changes in Rust.

## Consequences

- Scripts are easier to find and reason about by category.
- All npm scripts, Tauri build, tailwind extraction, and the install-runner API continue to work with updated paths.
- Repo-root resolution in moved scripts uses `path.join(__dirname, "..", "..")` (or equivalent) so they work from their new locations.
- If run_prompts or run_analysis features are invoked without the corresponding scripts present, the app returns a clear “script not found” error.
- script/README.md documents the new layout and reference points.
