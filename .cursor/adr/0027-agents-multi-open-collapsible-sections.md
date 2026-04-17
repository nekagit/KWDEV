# ADR 0027: Agents Multi-Open Collapsible Sections

## Status
Accepted

## Context
Agents UI used single-selection tab behavior, which prevented opening multiple agent sections simultaneously and made side-by-side monitoring slower.

## Decision
Replace single-active tabs in the Agents UI with independently toggled collapsible sections:

- Testing, Cleanup, Refactor, and Night Shift are now section panels.
- Each section can be clicked to open/close.
- Multiple sections can remain open at once.

Implementation adds a small toggle helper with explicit defaults and test coverage.

## Consequences

### Positive
- Faster operational workflow by keeping multiple agent outputs visible.
- Better parity with user expectation for click-to-open/click-to-close interaction.

### Trade-offs
- Slightly taller UI when multiple sections are open.

## Validation
- Added helper and tests:
  - `src/lib/worker-agents-sections.ts`
  - `src/lib/__tests__/worker-agents-sections.test.ts`
