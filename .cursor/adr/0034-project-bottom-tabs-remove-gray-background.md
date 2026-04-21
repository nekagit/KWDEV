# ADR 0034: Remove Gray Background From Project Bottom Tabs

## Status
Accepted

## Context
- The fixed bottom tab bar on the project details page used `bg-sidebar`, which produced a visible gray strip.
- Current UI direction in `PROJECT.md` favors cleaner and flatter surfaces in the Worker and project navigation areas.
- The requested behavior is to remove that gray background from the bottom tabs.

## Decision
- Update the bottom `TabsList` in `src/components/organisms/ProjectDetailsPageContent.tsx` to use `bg-transparent` instead of `bg-sidebar`.
- Keep `backdrop-blur-sm`, borders, spacing, and tab interaction states unchanged.

## Rationale
- `bg-transparent` removes the unintended gray strip while preserving existing structure and readability.
- Scope is minimal and isolated to the bottom tab container class only.

## Validation
- Added regression test: `src/lib/__tests__/project-details-bottom-tabs-style.test.ts`.
- Test assertion ensures `ProjectDetailsPageContent.tsx` no longer contains `bg-sidebar` for the bottom tab bar.

## Consequences
- Project bottom tab bar no longer renders with a gray base background.
- Existing active/inactive tab styles continue to provide visual affordance.
