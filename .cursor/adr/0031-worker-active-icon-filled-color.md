# ADR 0031: Worker Active Icon Filled Color

## Status
Accepted

## Date
2026-04-17

## Context
The top Worker app card could be active while the icon itself still looked lightly tinted.
Requested behavior: when active, the app icon should be clearly filled with color.

## Decision
Add a helper to compute icon wrap classes for active/inactive states and apply stronger fill for active state.

## Implementation
- Updated `src/lib/worker-run-top-apps.ts`:
  - Added `getWorkerTopAppIconWrapClassName(...)` to transform accent icon background to stronger fill (`/90`) and remove border.
- Updated `src/components/organisms/Tabs/ProjectRunTab.tsx`:
  - Icon wrapper now uses the new helper.
  - Active icon glyph switches to `text-white` for contrast.

## Consequences
### Positive
- Active section selection is clearer at icon level.
- Works with existing per-app accent colors.

### Trade-offs
- Strong fill is visually bolder than previous subtle tint.

## Validation
- Extended tests in `src/lib/__tests__/worker-run-top-apps.test.ts`.
- Worker-related tests pass.
- Lint diagnostics on changed files are clean.

## Follow-up
- Replaced dynamic class-string transformation with explicit static color mappings (`cyan`, `fuchsia`, `violet`, `sky`) so Tailwind reliably emits all active fill classes. This fixes cases where only one icon color appeared filled while others looked white.
