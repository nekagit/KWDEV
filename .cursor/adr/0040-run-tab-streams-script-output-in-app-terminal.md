# ADR 0040: Run Tab Streams Script Output In-App

## Status
Accepted

## Context
- Running a script from the project `Run` tab opened a separate macOS terminal window.
- The in-app `Terminal output` section stayed empty in that flow, which made the run panel look broken and split output across two places.

## Decision
- Start scripts from `ProjectBottomRunTab` using `runNpmScript` only.
- Stop using `runNpmScriptInExternalTerminal` in the `Run` tab script-button flow.
- Keep the terminal feedback in one place: the in-app `Terminal output` panel.
- Update copy in the scripts section to reflect this behavior.

## Validation
- `src/lib/__tests__/project-bottom-run-tab-migration.test.ts` now verifies the run tab:
  - uses `runNpmScript`,
  - does not reference `runNpmScriptInExternalTerminal`,
  - keeps the `Running. Output below.` success signal.

## Consequences
- Script output is consistently visible in the `Run` tab without switching to a separate terminal window.
- UX is simpler and better aligned with the terminal panel purpose.
