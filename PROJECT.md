# KWDEV Project Single Source

## Purpose
KWDEV is a project/workflow workspace focused on agent-driven software execution from a desktop Tauri app and a web UI. It combines project management, worker automation, run history, and prompt-driven execution in one interface.

## Core Areas
- **Projects page**: central project navigation and details.
- **Worker tab**: agent execution workflows (Vibing, Agents, terminals, queue, history).
- **Planner tab**: ticket and kanban planning.
- **Control tab**: implementation logging and outcomes.
- **Versioning tab**: git-focused project visibility.

## Worker Visual System (current)
- Worker top-level sections now use a shared colorful surface system defined in `src/lib/worker-run-layout.ts` (`WORKER_RUN_SECTION_SURFACE_CLASSNAME`).
- Unified colorful section surfaces are applied across:
  - Status
  - Queue
  - Agents (existing colorful baseline)
  - Night Shift
  - Vibing
  - Quality
  - Terminal Output
- Goal: consistent card language from Status through Terminal Output while keeping distinct color accents per section.
- Border density has been reduced across Worker surfaces and nested content blocks (especially Agents and Night Shift) to avoid card-in-card visual noise.
- Worker action buttons are standardized toward colorful gradient actions for primary flows (start/stop/clear/terminal actions) to keep interaction styling consistent.

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
  - Cleanup Agent
  - Refactor Agent
  - Night Shift
- Default tab is Testing Agent.
- Agent cards use icon-based status badges and single-line action controls (start/stop/clear output).
- Night Shift is presented with the same card design language as the other agent panels.
- Cleanup and Refactor now use the same loop principle as Testing (start loop, auto-replenish on run exit, stop prevents new iterations).

## Testing Agent Loop (MVP)
- Designed to mirror Night Shift loop semantics.
- Start flow:
  1. Generate prompt from project context + optional `data/prompts/testing-agent.prompt.md`.
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

## Cleanup + Refactor Agent Loops
- Cleanup and Refactor loops follow the same orchestration pattern as Testing:
  1. Generate iteration prompt from project context plus optional prompt template files.
  2. Create iteration entries immediately for UI visibility.
  3. Enqueue run via `runTempTicket(...)` with loop-specific run metadata.
  4. On `script-exited`, hydration completes iteration output/artifact extraction and triggers replenish callback if loop is still active.
- Prompt template paths:
  - `data/prompts/cleanup-agent.prompt.md`
  - `data/prompts/refactor-agent.prompt.md`
- Agent prompts now explicitly enforce code-only scope:
  - modify only code-related files (source/tests/code tooling config),
  - do not modify any `.md` files.

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
