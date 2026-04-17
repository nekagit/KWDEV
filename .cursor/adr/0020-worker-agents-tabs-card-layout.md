# ADR 0020: Worker Agents Tab Card Layout

## Status
Accepted

## Context
The Worker tab Agents section used table-based rows with `Project`, `Status`, and `Actions` columns. This created visual density, repeated project data, and made action controls feel fragmented.

The project single source (`PROJECT.md`) describes the Worker area as an agent workflow surface, where controls and status should be quick to scan and execution-focused.

## Decision
Replace the table-based UI in `ProjectWorkerAgentsSection` with a tabbed card layout:

- Use tabs (`All`, `Testing`, `Cleanup`, `Refactor`) for fast section switching.
- Remove the project column entirely from agent rows/cards.
- Represent status with icon + label badges.
- Keep action controls in one inline row (`md:flex-nowrap`) for clear operational flow.

## Consequences

### Positive
- Reduced noise and less repeated information.
- More workflow-oriented presentation for agent controls.
- Better alignment with Worker tab behavior-first UX.

### Trade-offs
- More custom UI structure compared to simple table primitives.
- Layout intent now depends on utility class conventions that should remain tested.

## Validation
- Added tests for status metadata mapping and single-line action row behavior:
  - `src/lib/__tests__/project-worker-agents-layout.test.ts`
