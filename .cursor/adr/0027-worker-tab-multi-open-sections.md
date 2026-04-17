# ADR 0027: Worker Tab Multi-Open Sections

## Status
Accepted

## Date
2026-04-17

## Context
In the Worker tab, selecting a section card (Status, Queue, Agents, Vibing, Enhancements, Terminal Output) replaced the previously opened section.
This made the UI behave like single-select tabs, while the intended interaction is accordion-like multi-open behavior where each section remains open until explicitly collapsed.

## Decision
Switch Worker section state from single active value to a list of open section IDs.

Implementation details:
- Added `src/lib/worker-run-sections.ts` with `toggleWorkerRunSection(...)` helper.
- Updated `src/components/organisms/Tabs/ProjectRunTab.tsx`:
  - section cards now toggle their own open/closed state,
  - multiple sections can stay open simultaneously,
  - each open section retains its own Collapse action.
- Added tests at `src/lib/__tests__/worker-run-sections.test.ts`.

## Consequences
### Positive
- Worker sections no longer auto-close when another section is opened.
- Behavior matches user expectation: click to open, click again to close.
- Toggle behavior is isolated and unit tested.

### Trade-offs
- More vertical content can remain visible at once, which can increase page length.

## Validation
- Unit tests for open/close toggle pass.
- Lint diagnostics on changed files are clean.
