# ADR 0033: Worker Agents Run All With Idea-Driven Night Shift

## Status
Accepted

## Context
- The Agents card had per-agent start controls, but no single action to run all workflows together.
- The requested UX is a top-right button in the Agents card that starts Testing, Cleanup, Refactor, and Night Shift in idea-driven mode in one click.
- Night Shift lives inside the Night Shift tab content, which may not be open when the one-click action is used.

## Decision
- Add a top-right `Run All` button to `ProjectWorkerAgentsSection`.
- The button starts each loop agent that is currently startable:
  - Testing
  - Cleanup
  - Refactor
- After dispatching those starts, emit a window event (`worker-run-night-shift-idea-driven`) to start Night Shift in idea-driven mode.
- Add an event listener in `WorkerNightShiftSection` to call existing `handleAutoIdeaDriven` when that event is received.
- Set Night Shift `TabsContent` to `forceMount` so Night Shift startup logic is mounted and can receive the event even when its tab is not selected.

## Consequences
- Users can start all worker agents and idea-driven Night Shift from one obvious control in the Agents card header.
- Existing Night Shift start logic is reused; no duplicate night-shift orchestration code is introduced.
- Event-based coupling between Agents and Night Shift is explicit and minimal, but requires the event name to stay stable.
