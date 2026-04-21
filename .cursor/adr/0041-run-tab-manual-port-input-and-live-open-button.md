# ADR 0041: Run Tab Manual Port Input And Live Open Button

## Status
Accepted

## Context
- The `Run` card relied on a preset dropdown plus a custom-mode toggle for port editing.
- The `Open running app` button was disabled when `project.runPort` was not saved yet, even if a valid port was already typed in the input.
- This created friction for quick local testing where users want to type a port and open immediately.

## Decision
- Replace the port preset dropdown with a single manual numeric input in `ProjectBottomRunTab`.
- Compute port validity directly from the live `portInput` value.
- Enable `Open running app` whenever the current typed port is valid (`1..65535`), without waiting for persisted project state.
- Pass the selected port to the running-app modal and render the iframe/link from that explicit port.

## Validation
- `src/lib/__tests__/project-bottom-run-tab-migration.test.ts` now verifies:
  - no preset-dropdown dependency in the run tab source,
  - manual input presence (`placeholder="Port"`),
  - live port parsing/validation logic for the open button.
- Targeted test run passed:
  - `npm test -- src/lib/__tests__/project-bottom-run-tab-migration.test.ts`

## Consequences
- The run-preview flow is faster: type a port and open immediately.
- The UI is simpler (single input instead of preset + custom mode).
- Modal behavior is now deterministic from current user intent (typed port), while autosave to `runPort` can still happen in the background.
