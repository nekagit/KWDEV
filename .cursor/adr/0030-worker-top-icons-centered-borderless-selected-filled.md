# ADR 0030: Worker Top Icons Centered, Borderless, Selected Filled

## Status
Accepted

## Date
2026-04-17

## Context
The Worker top app icon buttons were not visually centered and used border-heavy button styling.
Requested behavior:
- top app icons should be centered,
- buttons should not show borders,
- selected buttons should use filled accent color treatment.

## Decision
Create style helpers for Worker top app row/button classes and apply them in `ProjectRunTab`.

## Implementation
- Updated `src/lib/worker-run-top-apps.ts`:
  - `WORKER_TOP_APPS_ROW_CLASSNAME` centers icon row.
  - `getWorkerTopAppButtonClassName(...)` returns borderless button classes and selected filled style.
- Updated `src/components/organisms/Tabs/ProjectRunTab.tsx` to use these helpers.
- Icon container styling is also borderless in both active and inactive states.

## Consequences
### Positive
- Cleaner top navigation visual style.
- Selection state is clearer through fill color, not border.
- Style decisions are centralized and tested.

### Trade-offs
- Border removal slightly reduces edge contrast in low-contrast themes.

## Validation
- Added/updated tests in `src/lib/__tests__/worker-run-top-apps.test.ts`.
- Worker-related tests pass.
- Lint diagnostics on changed files are clean.
