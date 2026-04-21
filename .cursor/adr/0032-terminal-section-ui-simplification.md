# ADR 0032: Terminal Section UI Simplification

## Status
Accepted

## Date
2026-04-17

## Context
The Terminal area in Worker tab contained extra UI that reduced clarity:
- embedded Worker status block at the top of Terminal section,
- command input row ("Enter command to run...") with "Run in terminal" button,
- verbose copy/download button labels in each terminal card header.

User requested a cleaner terminal-first UI.

## Decision
Simplify Terminal area by removing non-essential controls and making action buttons icon-only.

## Changes
- `src/components/organisms/Tabs/ProjectRunTab.tsx`
  - Removed embedded `WorkerStatusBar` from Terminal section.
  - Removed external command input + run button row from `WorkerTerminalsSection`.
- `src/components/molecules/Display/TerminalSlot.tsx`
  - Changed header copy/download controls to icon-only buttons.
  - Kept accessibility via `title` and `aria-label`.

## Consequences
### Positive
- Cleaner and less noisy terminal surface.
- More space for terminal output content.
- Faster scanability of terminal cards.

### Trade-offs
- Removed one-click external Terminal command launcher from this view.
- Users rely on existing run flows (Asking/Fast/Debugging/etc.) for execution.

## Validation
- Worker regression tests pass:
  - `worker-run-sections.test.ts`
  - `worker-run-layout.test.ts`
  - `worker-run-top-apps.test.ts`
- Lint diagnostics for changed files are clean.
