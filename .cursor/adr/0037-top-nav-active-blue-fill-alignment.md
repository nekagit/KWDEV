# ADR 0037: Align Top Nav Active Style to Blue Filled Pattern

## Status
Accepted

## Context
- The top application navbar active item used a muted style (`bg-primary/10`) that did not match the stronger blue-filled active pattern used in project bottom tabs.
- Visual inconsistency made active state feel different between global navigation and project-level navigation.

## Decision
- Introduce shared top-nav style constants in `src/lib/top-nav-style.ts`.
- Update `src/components/templates/AppShell.tsx` to consume these constants.
- Set active top-nav style to:
  - `bg-blue-500/90`
  - `text-white`
- Keep inactive top-nav behavior unchanged.

## Validation
- `src/lib/__tests__/top-nav-style.test.ts` verifies active top-nav class includes the expected blue fill and white text tokens.
- Regression style test for project bottom tabs remains passing.

## Consequences
- Global top navigation now matches the active visual language used by project bottom tabs.
- Active state is easier to spot and more consistent across major navigation surfaces.
