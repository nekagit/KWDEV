# ADR 0042: Run Tab No Horizontal Overflow

## Status
Accepted

## Context
- The Run tab could become wider than the viewport on narrower screens.
- Users needed to scroll horizontally to see full card content, especially around terminal action/status areas.

## Decision
- Apply overflow-safe layout constraints in Run tab sections:
  - enforce `min-w-0` on section wrappers and key flex rows,
  - allow wrapping for action rows with `flex-wrap`,
  - keep root run tab container constrained with `overflow-x-hidden`.
- Apply the same wrapping/shrinking constraints in `TerminalSlot` header controls to prevent status/actions from forcing extra width.

## Validation
- Extended run-tab migration tests to assert overflow-safe class usage in:
  - `src/components/organisms/Tabs/ProjectBottomRunTab.tsx`
  - `src/components/molecules/Display/TerminalSlot.tsx`
- Verified with:
  - `npm test -- src/lib/__tests__/project-bottom-run-tab-migration.test.ts`

## Consequences
- Run tab content fits within page width without horizontal scrolling.
- Terminal controls remain usable while adapting to smaller widths.
