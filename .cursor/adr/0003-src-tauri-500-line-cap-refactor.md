# ADR 0003: src-tauri file size cap (500 lines) and module split

## Status

Accepted (partial: db completed; lib.rs split planned).

## Context

- **Constraint:** No file in `src-tauri` should exceed 500 lines of code.
- **Before:** `src-tauri/src/lib.rs` was ~4,586 lines and `src-tauri/src/db.rs` was ~1,295 lines, making navigation and maintenance difficult.

## Decision

1. **Database layer (done)**  
   - Replace single `db.rs` with a `db/` module:
     - `db/mod.rs` – `open_db`, re-exports (~51 lines).
     - `db/constants.rs` – KV key constants (~7 lines).
     - `db/schema.rs` – `init_schema`, `migrate_projects_from_kv_store` (~256 lines).
     - `db/projects.rs` – data dir, projects table, active/current project (~228 lines).
     - `db/kv.rs` – `KvEntry`, `get_kv_store_entries` (~30 lines).
     - `db/legacy.rs` – tickets, features, prompts, designs (~191 lines).
     - `db/plan.rs` – plan tickets and kanban (~206 lines).
     - `db/milestones_ideas.rs` – milestones and ideas (~253 lines).
     - `db/docs_configs.rs` – project docs and configs (~174 lines).
   - All of these stay under 500 lines. Public API is unchanged (`db::open_db`, `db::get_*`, etc.).

2. **Application entry (lib.rs) – planned**  
   - `lib.rs` remains large (~4,586 lines) and should be split in a follow-up:
     - Extract shared **types** (Ticket, Feature, Prompt, Design, RunScriptArgs, payloads, etc.) into a `types` (or `models`) module.
     - Extract **run state** (RunEntry, RunningState) into a small module.
     - Extract **path/DB helpers** (`with_db`, `data_root`, `project_root`, script paths, etc.) into a `paths` or `helpers` module.
     - Extract **run/script** command blocks into one or more `run*` or `commands/run*` modules (each ≤500 lines).
     - Keep `lib.rs` as the Tauri entry: `mod` declarations, `run()`, setup, and `invoke_handler` registration only, so it stays under 500 lines.

3. **Convention**  
   - New or touched modules in `src-tauri` should be kept under 500 lines; split by domain (e.g. db, run, projects, git, files) rather than by arbitrary line count.

## Consequences

- **db:** Clearer structure, faster navigation, and smaller, focused files. No change to callers.
- **lib.rs:** Still to be refactored; ADR documents the intended direction and 500-line cap for future work.
