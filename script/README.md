# script

Build, dev, and tooling scripts organized by purpose.

## Layout

| Folder | Purpose |
|--------|---------|
| **tauri/** | Tauri dev/build: wait-dev-server, build-for-tauri, tauri-with-local-target, tauri-build, copy-build-to-desktop. Referenced by `package.json` and `src-tauri/tauri.conf.json`. |
| **tailwind/** | Tailwind extraction and codemods: extract-tailwind-classes, extract-tailwind-molecules, codemod-molecules-use-json-classes, enhance_tailwind_classes. Run via `npm run extract:tailwind-classes` and `npm run extract:tailwind-molecules`. |
| **scaffold/** | Cursor scaffolding: scaffold-cursor-md. Run via `npm run scaffold:cursor-md`. |
| **worker/** | Scripts invoked by the Tauri backend: implement_all.sh, run_terminal_agent.sh, run_claude_agent.sh, run_gemini_agent.sh. Paths are hardcoded in `src-tauri/src/lib.rs`; do not move without updating Rust. |
| **ai-bots/** | AI bots cron runner and helpers: run_cron_jobs.py, run-cron-jobs.sh, send-telegram.sh, run-zeroclaw.sh. Deployed by `/api/ai-bots/cron/install-runner`. |
| **codemods/** | One-off refactor scripts (fix-imports, restructure-components, enforce-atomic, add-file-comments). Run manually from repo root. |
| **setup/** | Project/setup automation: setup-documentation.sh, initialize-project.sh, install-deps-and-build-desktop.sh. |
| **data/** | Tickets/milestones helpers: generate-milestones.js, create-tickets.js, clear-all-tickets.mjs. Run manually; optional follow-up after initialize-project. |
| **run/** | Run/CLI helpers: run-claude-from-home.sh, claude binary. |

## Data

Runtime entity data (projects, ideas, prompts, tickets, designs, architectures) is stored in **data/app.db** (SQLite). The `data/*.json` files are no longer used for CRUD; see `.cursor/adr/0003-migrate-data-json-to-db.md`.

## References

- **package.json** — npm script paths point to `script/tauri/`, `script/tailwind/`, `script/scaffold/`.
- **src-tauri/tauri.conf.json** — `beforeBuildCommand` uses `script/tauri/build-for-tauri.mjs`; bundle includes `script/worker/run_terminal_agent.sh`.
- **src/components/shared/tailwind-classes.json** — `_meta.script` records `script/tailwind/extract-tailwind-classes.mjs`.
- **src/app/api/ai-bots/cron/install-runner/route.ts** — reads from `script/ai-bots/` for run_cron_jobs.py and run-cron-jobs.sh.

## Missing scripts (Rust)

The Tauri backend expects `script/run_prompts_all_projects.sh` and `script/run_analysis_single_project.sh`; these files are not in the repo. If those features are invoked, Rust returns a clear “script not found” error. See ADR 0002.
