# ADR 0004: Terminal agent always uses KWDEV @data and @script

## Status

Accepted.

## Context

When running the terminal agent (e.g. "Ask" prompt, "Run terminal agent to fix") for a **target project** (e.g. KW-March-LLMOverlay), the app should not depend on that project having a `.cursor` folder or its own `data/` and `script/`. Failures (e.g. exit 1) or missing behaviour can occur when:

- The target project has no `data/agents` or `.cursor/2. agents`, so agent instructions are empty.
- Script or data paths were ever resolved relative to the target project instead of the KWDEV repo.

We want the terminal agent to **always** use **script** and **data** from the KWDEV workspace so it works regardless of the target project’s structure.

## Decision

1. **Script**
   - The run terminal agent flow already resolves the script from the **KWDEV workspace** in Rust: `project_root()` yields the repo that contains `script/worker/run_terminal_agent.sh` and `data/`. The script path is `run_terminal_agent_script_path(ws)`. When `project_root()` fails (e.g. packaged app not started from the repo), the app falls back to the bundled resource `run_terminal_agent.sh` from the Tauri bundle. No change required; behaviour is already workspace/bundle-based.

2. **Data (agents)**
   - In Tauri, when building prompts that include agent instructions (e.g. Ask, Fast dev, fix-bug), the app **prefers** loading from the **KWDEV workspace** `data/agents`:
     - New Tauri command `get_workspace_root()` returns the KWDEV repo path (same as `project_root()` in Rust).
     - New API `loadWorkspaceAgentsContent()` uses `get_workspace_root`, then `list_files_under_root(ws, "data/agents")` and `read_file_text_under_root(ws, "data/agents/<file>")` to concatenate all `.md` agent files from the workspace.
     - `loadAllAgentsContent(projectId, repoPath)` in the Run tab: when `isTauri`, it first calls `loadWorkspaceAgentsContent()`; if that returns content, it uses it. Otherwise it falls back to the target project’s `data/agents` (via existing `listProjectFiles` / `readProjectFileOrEmpty` with project `repoPath`).
   - So in Tauri, agent instructions come from KWDEV `data/agents` when the workspace is available, making the Ask (and other) prompts independent of the target project’s `.cursor` or `data/`.

3. **Documentation**
   - This ADR records the rule: terminal agent uses **@data** and **@script** from the KWDEV workspace (or app bundle for script when workspace is not found), not from the target project.

## Consequences

- Ask prompt and other terminal-agent prompts get agent instructions from KWDEV `data/agents` when running in the desktop app, so they work even when the target project has no `.cursor` or `data/`.
- Single source of truth for script and agent data is the KWDEV repo (or bundle), reducing dependency on the target project’s layout.
- Exit 1 or other failures from the agent CLI itself (e.g. Cursor `agent` not in PATH, workspace not trusted, or prompt errors) are unchanged; this ADR only ensures **where** script and data are loaded from.
