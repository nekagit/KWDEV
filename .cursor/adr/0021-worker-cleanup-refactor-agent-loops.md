# ADR 0021: Cleanup and Refactor Agent Loop Parity

## Status
Accepted

## Context
Worker Agents previously had full loop orchestration only for Testing Agent (start, stop, replenish, iteration output extraction). Cleanup and Refactor appeared in the UI but were not operational loops.

## Decision
Implement Cleanup Agent and Refactor Agent with the same orchestration principle as Testing Agent:

- Loop state in run store (`active`, `status`, `iterations`, replenish callback).
- Iteration launch pattern:
  - build prompt from project context + optional prompt template,
  - add iteration immediately to state,
  - enqueue run via `runTempTicket(...)` with loop metadata.
- Hydration on `script-exited`:
  - mark iteration execution output and extracted artifacts,
  - trigger replenish callback when loop remains active.
- Worker tab cards now provide Start/Stop/Clear controls and iteration output panels for Cleanup and Refactor, matching Testing behavior.

## Consequences

### Positive
- Consistent user mental model across all agent loops.
- Cleanup/Refactor are now production-usable loops instead of placeholders.
- Shared helper module (`worker-agent-loop`) reduces duplicated loop transition logic.

### Trade-offs
- Added store and hydration state complexity (more agent-specific flags and callbacks).
- Artifact extraction is heuristic-based from stdout and may need future refinement.

## Validation
- Added unit tests:
  - `src/lib/__tests__/worker-agent-loop.test.ts`
- Existing related tests pass:
  - `src/lib/__tests__/testing-agent-loop.test.ts`
  - `src/lib/__tests__/project-worker-agents-layout.test.ts`
