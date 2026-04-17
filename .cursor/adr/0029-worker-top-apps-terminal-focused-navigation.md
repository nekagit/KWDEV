# ADR 0029: Worker Top Apps Terminal-Focused Navigation

## Status
Accepted

## Date
2026-04-17

## Context
The Worker top icon row included `Status` and `Queued Tasks` as standalone apps, while the terminal workflow already has queue/history context in the terminal panel.
This made top navigation noisy and duplicated queue/status surfaces.

## Decision
- Remove `Status` and `Queued Tasks` from the top Worker icon row.
- Keep top-row focus on: `Agents`, `Vibing`, `Enhancements`, and `Terminal`.
- Rename `Terminal Output` label to `Terminal`.
- Integrate live status summary directly into the terminal panel above tabs.

## Implementation
- Added `src/lib/worker-run-top-apps.ts` as a small source of truth for:
  - `WORKER_TOP_APP_IDS`
  - `TERMINAL_TOP_APP_LABEL`
- Updated `src/components/organisms/Tabs/ProjectRunTab.tsx`:
  - top icon row now uses filtered top apps,
  - terminal app label now reads `Terminal`,
  - `WorkerStatusBar` is rendered inside terminal panel.

## Consequences
### Positive
- Cleaner top navigation with less duplication.
- Status context is colocated with terminal execution area.
- Naming is shorter and aligned with user wording.

### Trade-offs
- Status is no longer directly accessible as a standalone app card.

## Validation
- Added tests in `src/lib/__tests__/worker-run-top-apps.test.ts`.
- Existing worker layout and section toggle tests pass.
- Lint diagnostics for changed files are clean.
