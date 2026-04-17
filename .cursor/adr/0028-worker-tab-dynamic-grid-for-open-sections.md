# ADR 0028: Worker Tab Dynamic Grid For Open Sections

## Status
Accepted

## Date
2026-04-17

## Context
Worker tab sections can now stay open in parallel. With multiple sections open, rendering them in one long vertical column reduces scanability and wastes horizontal space.
Desired behavior:
- when a single section is open, it should use full width,
- when at least two sections are open, they should share a two-column grid,
- transitions should feel smooth while opening/closing sections.

## Decision
Add a small layout helper for Worker section containers and card transitions, then apply it in `ProjectRunTab`.

Implementation:
- New helper file: `src/lib/worker-run-layout.ts`
  - `getWorkerRunSectionsGridClassName(openCount)` for 1-column vs 2-column grid classes.
  - `WORKER_RUN_SECTION_CARD_CLASSNAME` for smooth transition classes.
- Updated `src/components/organisms/Tabs/ProjectRunTab.tsx`
  - Open section panel now renders through a dynamic grid container.
  - One open section: full-width single column.
  - Two or more open sections: responsive two-column layout.

## Consequences
### Positive
- Better visual density and faster comparison when multiple Worker sections are open.
- Keeps single-section focus when only one section is open.
- Transition styling is centralized and testable.

### Trade-offs
- Grid reflow animation in CSS is best-effort; exact FLIP-style motion is not implemented.

## Validation
- Added tests in `src/lib/__tests__/worker-run-layout.test.ts`.
- Existing section toggle tests still pass.
- Lint diagnostics for changed files are clean.
