# ADR 0010: Worker tab — Enhancements card (Tools and Context)

## Status

Accepted.

## Context

Users want to (1) choose which static analysis checklist tools run per project when using « Apply static analysis checklist » in Debugging, and (2) see which prompts, MCPs, and rules are active and sent with the next task when using Fast, Debugging, Night shift, or Planning.

## Decision

- **Enhancements card**
  - Add a new card **Enhancements** in the Worker tab, after the Vibing section and before the Terminals/Queue/History card. The card has two tabs: **Tools** and **Context**.

- **Tools tab**
  - List all static analysis tools from `STATIC_ANALYSIS_CHECKLIST` (tsc, eslint, ruff, etc.). Each tool can be enabled or disabled per project via a checkbox.
  - Persist the selection in the database using the existing project config mechanism: new config type `static_analysis_tools` with payload `{ toolIds: string[] }`.
  - Backend: add `"static_analysis_tools"` to `PROJECT_CONFIG_TYPES` in Tauri (`docs_configs.rs`) and to `ProjectConfigType` in `api-projects.ts`.
  - When the user runs the static analysis checklist (direct Tauri run or agent run from Debugging), only the selected tools are used. Default when no config is saved: all tools (current behaviour).

- **Context tab**
  - Read-only view of context sent or active with worker tasks:
    - **Prompts**: List known worker prompt paths (data/prompts/*.prompt.md and data/agents) and which mode uses them (Night shift, Debugging, etc.).
    - **Agent instructions**: List .md files in data/agents for the project (or note workspace data/agents in desktop app).
    - **Rules**: List files under .cursor/rules for the project.
    - **MCPs**: Short note that MCPs are determined by Cursor/workspace settings and apply when the agent runs in the desktop app.

- **Run integration**
  - `runStaticAnalysisChecklist(projectPath, selectedToolIds?)` in the run store: when `selectedToolIds` is provided, filter the checklist to those IDs before sending to Tauri; otherwise send all tools.
  - `buildStaticAnalysisPrompt(selectedToolIds?)` in static-analysis-checklist: when provided, include only the selected tools in the generated prompt; otherwise include all.
  - WorkerDebuggingSection loads `getProjectConfig(projectId, "static_analysis_tools")` when applying the checklist and passes `config?.toolIds` to both the store and `buildStaticAnalysisPrompt`.

## Consequences

- Per-project static analysis tool selection is stored in `project_configs` (config_type `static_analysis_tools`). Only selected tools run when the user applies the checklist from Debugging.
- Users can see at a glance which prompts, rules, and agent instructions apply to worker tasks; MCP behaviour is documented in the Context tab.
- In the browser (non-Tauri), tool selection UI is visible but persistence is desktop-only; a note in the Tools tab explains this.
