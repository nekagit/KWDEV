# ADR 0043: Project Details Content Horizontal Overflow Guard

## Status
Accepted

## Context
- Run tab UI improvements reduced many overflow cases, but horizontal page scrolling could still appear after starting scripts.
- The main project-details tab content container allowed both-axis scrolling via `overflow-auto`, so any transient wide child could expand horizontal scroll.

## Decision
- Change the main tab content container in `ProjectDetailsPageContent` from `overflow-auto` to:
  - `overflow-y-auto overflow-x-hidden`
- Keep vertical scroll behavior unchanged while enforcing page-level horizontal clipping.

## Validation
- `src/lib/__tests__/project-bottom-run-tab-migration.test.ts` now asserts the project-details content wrapper includes `overflow-y-auto overflow-x-hidden`.
- Test command:
  - `npm test -- src/lib/__tests__/project-bottom-run-tab-migration.test.ts`

## Consequences
- Project details tabs, including Run, no longer expand page width to the right during run startup or dynamic content updates.
- Horizontal overflow handling remains local to specific inner components (e.g., terminal log viewport) rather than the whole page.
