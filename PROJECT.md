# KWDEV Project Single Source

## Purpose
KWDEV is a project/workflow workspace focused on agent-driven software execution from a desktop Tauri app and a web UI. It combines project management, worker automation, run history, and prompt-driven execution in one interface.

## Core Areas
- **Projects page**: central project navigation and details.
- **Project tab (inside project details)**: focused on project files and ADR workspace management.
- **Setup tab (inside project details)**: top-level setup tabs are Prompts, Skills, Design, Rules, MCP, and Agents.
- **Rules in Setup**: Rules tab uses three category tabs: Architecture, Testing, and Security.
- **Bottom project circles**: project detail bottom circles are user-reorderable via drag-and-drop and persisted locally.
- **Worker tab**: agent execution workflows (Vibing, Agents, terminals, queue, history).
- **Planner tab**: ticket and kanban planning.
- **Control tab**: implementation logging and outcomes.
- **Versioning tab**: git-focused project visibility.

## Worker Visual System (current)
- Worker top-level sections now use a shared flat neutral surface system defined in `src/lib/worker-run-layout.ts` (`WORKER_RUN_SECTION_SURFACE_CLASSNAME`).
- Unified neutral section surfaces are applied across:
  - Status
  - Queue
  - Agents (existing colorful baseline)
  - Night Shift
  - Vibing
  - Quality
  - Terminal Output
- Goal: consistent card language from Status through Terminal Output with reduced visual noise and no gradients.
- Border density has been reduced across Worker surfaces and nested content blocks (especially Agents and Night Shift) to avoid card-in-card visual noise.
- Worker action buttons in Agents/Vibing are standardized to solid foreground fills for primary flows.
- Additional taste cleanup keeps Worker wrappers (top app row, terminal shell, nested cards) flat and minimal.

## Worker Architecture (current)
- Worker run orchestration is centered on `src/store/run-store.ts`.
- Script output lifecycle is hydrated in `src/store/run-store-hydration.tsx` from Tauri `script-log` and `script-exited` events.
- Queueing uses `runTempTicket(...)` + `processTempTicketQueue(...)` to dispatch runs when slots are free.
- Night Shift behavior is loop-based via `nightShiftActive` and `nightShiftReplenishCallback`.

## Agents Section (current)
- Location: Worker tab, above Vibing (`src/components/organisms/Tabs/ProjectRunTab.tsx`).
- UI component: `src/components/organisms/Tabs/ProjectWorkerAgentsSection.tsx`.
- Tabbed sections (one tab per area):
  - Testing Agent
  - Cleanup + Refactor
  - Night Shift
- Default tab is Testing Agent.
- Agent cards use icon-based status badges and single-line action controls (start/stop/clear output).
- A top-right `Run All` action starts Testing and Cleanup + Refactor loops together and also triggers Night Shift in idea-driven mode.
- Night Shift is presented with the same card design language as the other agent panels.
- Night Shift tab content is force-mounted so idea-driven starts can be triggered from `Run All` even when the Night Shift tab is not currently open.
- Cleanup + Refactor uses the same loop principle as Testing (start loop, auto-replenish on run exit, stop prevents new iterations).

## Testing Agent Loop (MVP)
- Designed to mirror Night Shift loop semantics.
- Start flow:
  1. Generate prompt from project context + optional `data/prompts/workflows/testing-agent.prompt.json` (`source_markdown` payload).
  2. Create an iteration entry for UI visibility.
  3. Enqueue run through `runTempTicket(...)` with testing-agent run metadata.
- Loop continuation:
  - On `script-exited`, hydration checks testing-agent metadata and triggers `testingAgentReplenishCallback` when loop is active.
- Stop flow:
  - Set loop inactive and clear replenish callback.
  - Current run may finish, but no new iteration is scheduled.

## Testing Agent Output Visibility
- Iterations are shown in the Testing Agent tab as readable sections:
  - Generated Prompt
  - Execution Result
  - Created Tests
- Execution and artifact extraction are populated when runs complete in hydration.
- Prompt now enforces stronger iteration scope:
  - include an execution plan,
  - target meaningful multi-file work (at least 3 files when possible),
  - run tests and provide changed-file summary.
- Prompt scope is code-only:
  - modify code-related files only,
  - do not modify `.md` files.

## Cleanup + Refactor Agent Loop
- Combined Cleanup + Refactor loop follows the same orchestration pattern as Testing:
  1. Generate iteration prompt from project context plus optional prompt template files.
  2. Create iteration entries immediately for UI visibility.
  3. Enqueue run via `runTempTicket(...)` with loop-specific run metadata.
  4. On `script-exited`, hydration completes iteration output/artifact extraction and triggers replenish callback if loop is still active.
- Prompt template paths:
  - `data/prompts/workflows/cleanup-refactor-agent.prompt.json` (optional, fallback prompt is used when missing)
- Agent prompts now explicitly enforce code-only scope:
  - modify only code-related files (source/tests/code tooling config),
  - do not modify any `.md` files.
- Selected Quality tools are loaded from project config key `cleanup_refactor_tools` and injected into each Cleanup + Refactor iteration prompt as explicit focus areas.

## Prompt Runtime Source (current)
- Runtime prompt loading is JSON-primary for worker flows.
- `data/prompts/workflows/*.prompt.json` is the execution source, parsed from `source_markdown`.
- `data/prompts/workflows/*.prompt.md` remains the editable markdown companion and must stay paired with the same stem.
- Prompt initialization now validates that each prompt stem has both files (`.prompt.md` and `.prompt.json`) and reports missing counterparts explicitly.

## Setup Entity Storage (current)
- Setup entities are DB-first and project-scoped.
- `Prompts`, `Skills`, `Rules`, and `Agents` are stored in `project_docs`:
  - `setup_prompts`
  - `setup_skills`
  - `setup_rules`
  - `setup_agents`
- `MCP` setup records are stored in `project_configs`:
  - `setup_mcp_servers`
- Setup migration status is tracked per project in `project_configs`:
  - `setup_migrations`
- Legacy file sources are imported once per entity and project, then Setup reads/writes DB only.

## Vibing Section
- Vibing now focuses on:
  - Asking
  - Planning
  - Fast
  - Debugging
- Night Shift was moved from Vibing into the Agents section.

## Quality Section
- Worker Quality now uses category tabs only (no Context tab).
- Categories:
  - Code Quality
  - Design Patterns
  - Best Practices
  - Code Smells
  - Code Refactoring
- Best Practices is grouped into:
  - Senior Level
  - Smart Practices
- Tool selection is persisted per project with config key `cleanup_refactor_tools`.
- Quality card now runs a Quality Audit prompt over all checked items and writes:
  - `quality-audit-report.md`
- Audit output requires per-item scoring and actionable suggestions.

## Agent Provider Resilience
- If selected provider (`claude`/`gemini`) is unavailable at runtime for queued worker-agent runs, queue processing now retries once with `cursor` provider automatically.

## Phase 2 Direction
- Evaluate backend-owned testing loop orchestration in Tauri for stronger persistence across UI lifecycle changes.
- Candidate additions:
  - durable loop state,
  - start/stop/query commands in backend,
  - richer structured step events.

## Key Files
- `src/components/organisms/Tabs/ProjectRunTab.tsx`
- `src/components/organisms/Tabs/ProjectWorkerAgentsSection.tsx`
- `src/store/run-store.ts`
- `src/store/run-store-hydration.tsx`
- `src/lib/testing-agent-loop.ts`
