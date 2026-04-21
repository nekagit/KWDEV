# ADR 0044: Run Tab Script Chip Overflow Hardening

## Status
Accepted

## Context
- Run tab horizontal overflow still appeared after scripts started, despite container-level overflow guards.
- Script chip labels can contain long, delimiter-heavy names that may bypass ordinary wrap expectations in button primitives.

## Decision
- Harden script chip rendering in `ProjectBottomRunTab`:
  - enforce `!whitespace-normal` and `overflow-hidden` on script buttons,
  - wrap script label text in its own span with `min-w-0 break-all whitespace-normal`.
- Harden active terminal run label row by using `min-w-0 flex-1 truncate` on the label element.

## Validation
- Extended assertions in `src/lib/__tests__/project-bottom-run-tab-migration.test.ts` for strict script-label overflow classes.
- Verified with:
  - `npm test -- src/lib/__tests__/project-bottom-run-tab-migration.test.ts`

## Consequences
- Long script names no longer force horizontal page growth when scripts start.
- Run tab remains width-stable while keeping script chips readable.
