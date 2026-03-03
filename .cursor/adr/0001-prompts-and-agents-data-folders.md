# ADR 0001: Prompts and agents under data/

## Status

Accepted.

## Context

Prompts (worker `*.prompt.md` files) and agent definitions (`.md` files) were under `.cursor/worker` and `.cursor/agents`. Keeping all app-managed content under a single `data/` tree improves clarity, backup, and portability.

## Decision

- **Prompts**: Use `data/prompts` as the canonical folder for all `*.prompt.md` files (replacing `.cursor/worker` for prompts).
- **Agents**: Use `data/agents` as the canonical folder for agent `.md` files (replacing `.cursor/agents`).

Code and APIs were updated to:

- Define `WORKER_ROOT = "data/prompts"` and `AGENTS_ROOT = "data/agents"` in `src/lib/cursor-paths.ts`.
- List and serve prompt files from `data/prompts` in `/api/data/cursor-prompt-files` and `/api/data/cursor-prompt-files-contents`.
- Allow reading files under `data/prompts/` and `data/agents/` (in addition to `.cursor/`) in `/api/data/cursor-doc`.
- Use `entry.path` (e.g. `data/prompts/...`) when opening a prompt file in the UI so cursor-doc can resolve correctly.

## Consequences

- Existing repos with `.cursor/worker` and `.cursor/agents` must copy or move content to `data/prompts` and `data/agents` if they want the app to use it; the app no longer reads those legacy paths for prompts/agents.
- `data/` is the single place for app data (projects, prompts export, and now prompts folder and agents folder), which simplifies documentation and tooling.
- All user-facing messages and script comments have been updated to reference `data/prompts` (no remaining `.cursor/worker` references).
