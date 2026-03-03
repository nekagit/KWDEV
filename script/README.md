# script

Build, dev, and tooling scripts used by the current codebase.

## Layout

| Folder | Purpose |
|--------|---------|
| **tauri/** | Tauri dev/build: wait-dev-server, build-for-tauri, tauri-with-local-target, tauri-build, copy-build-to-desktop. Referenced by `package.json` and `src-tauri/tauri.conf.json`. |
| **tailwind/** | Tailwind extraction: extract-tailwind-classes.mjs, extract-tailwind-molecules.mjs. Run via `npm run extract:tailwind-classes` and `npm run extract:tailwind-molecules`. |
| **scaffold/** | Cursor scaffolding: scaffold-cursor-md.mjs. Run via `npm run scaffold:cursor-md`. |
| **worker/** | Scripts invoked by the Tauri backend: implement_all.sh, run_terminal_agent.sh, run_claude_agent.sh, run_gemini_agent.sh. Paths are hardcoded in `src-tauri/src/lib.rs`; do not move without updating Rust. |

## References

- **package.json** — npm script paths point to `script/tauri/`, `script/tailwind/`, `script/scaffold/`.
- **src-tauri/tauri.conf.json** — `beforeBuildCommand` uses `script/tauri/build-for-tauri.mjs`; bundle includes `script/worker/run_terminal_agent.sh`.
- **src/components/shared/tailwind-classes.json** and **shared-classes.json** — `_meta.script` records `script/tailwind/extract-tailwind-classes.mjs`.
