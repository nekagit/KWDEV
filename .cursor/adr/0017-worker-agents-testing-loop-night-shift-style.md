# ADR 0017: Worker Agents section and Testing Agent loop reuse Night Shift pattern

## Status
Accepted

## Date
2026-04-17

## Context
The Worker tab needed a dedicated Agents area above Vibing with:
- Cleanup Agent
- Testing Agent
- Refactor Agent

For Testing Agent behavior, the requirement is an endless execution loop per selected project that repeatedly:
1. Generates a new prompt.
2. Displays the prompt.
3. Runs execution through terminal CLI.
4. Surfaces created tests/results.

The codebase already has a proven loop architecture in Night Shift:
- queue/run dispatch with `runTempTicket(...)`,
- event-driven completion via `script-exited`,
- replenishment via callback while active.

## Decision
- Add a new Worker Agents section above Vibing in `ProjectRunTab`.
- Implement Testing Agent loop as a Night Shift-style loop in frontend/store:
  - `testingAgentActive` + `testingAgentReplenishCallback` in run store.
  - run dispatch through existing `runTempTicket(...)`.
  - replenishment on `script-exited` when run meta indicates testing-agent run.
- Track and display per-iteration outputs in Testing Agent UI:
  - generated prompt,
  - execution result,
  - created tests summary.
- Keep Cleanup/Refactor tabs as table-based placeholders in this iteration for consistent structure.

## Consequences
- Fast integration with minimal new backend surface, reusing stable Worker primitives.
- Loop behavior and stop semantics are consistent with Night Shift, reducing cognitive and maintenance overhead.
- Testing Agent output is visible and inspectable directly in Worker UI.
- Loop lifecycle remains frontend-owned in MVP, so persistence across full app/session interruption is limited.

## Phase 2 (planned)
- Evaluate backend-owned orchestrator in Tauri for durable loop state and stronger recovery.
- Potential future changes:
  - backend `start/stop/get` loop commands,
  - persistent iteration state,
  - structured backend-emitted step events.
