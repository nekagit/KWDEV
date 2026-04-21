# ADR 0035: Color-Filled Style for Project Bottom Tabs

## Status
Accepted

## Context
- The project details bottom tabs still looked gray and bordered after removing the tab bar base gray background.
- The expected visual behavior is to match the Worker top app icon treatment: filled accent tones with stronger active state.

## Decision
- Update bottom project tab trigger styles in `src/components/organisms/ProjectDetailsPageContent.tsx` to:
  - use per-tab accent-filled backgrounds in inactive state,
  - use stronger per-tab color fills in active state,
  - remove bordered tab appearance from these triggers.
- Keep icon + label composition and existing tab behavior unchanged.

## Validation
- Regression tests in `src/lib/__tests__/project-details-bottom-tabs-style.test.ts` now assert:
  - no `bg-sidebar` usage for bottom tabs,
  - no old gray muted hover + active border combo,
  - color-filled style presence.

## Consequences
- Bottom tabs now visually align with Worker app-icon visual language.
- Active tab state is clearer and no longer reads as gray bordered chips.
