# Test Coverage Single Source of Truth

## Scope
- Track source changes and the exact tests that cover those changes.
- Keep this file updated for each feature or behavior change.

## Current Coverage Map
- `src/lib/worker-enhancements-testing-prompt.ts`
  - `src/lib/__tests__/worker-enhancements-testing-prompt.test.ts`
  - Coverage:
    - References `PROJECT.md` as single source of truth in prompt instructions.
    - Requires tech-stack analysis from the current codebase.
    - Requires latest open-source GitHub project suggestions and standard cleanup tools.

- `src/lib/project-git-commit-message.ts`
  - `src/lib/__tests__/project-git-commit-message.test.ts`
  - Coverage:
    - Reuses recent commit changelog style (`type(scope)`) when possible.
    - Builds a concise summary from changed-file count and top-level source areas.
    - Falls back to `Update` when there are no changed files.

- `src/lib/worker-run-sections.ts`
  - `src/lib/__tests__/worker-run-sections.test.ts`
  - Coverage:
    - Opening one Worker section keeps previously opened sections open.
    - Clicking an already opened section closes only that section.

- `src/lib/worker-run-layout.ts`
  - `src/lib/__tests__/worker-run-layout.test.ts`
  - Coverage:
    - One open Worker section renders in a single full-width column.
    - Two or more open Worker sections render in a two-column grid.
    - Section cards keep smooth transition classes for layout changes.

- `src/lib/worker-run-top-apps.ts`
  - `src/lib/__tests__/worker-run-top-apps.test.ts`
  - Coverage:
    - Top Worker icon row excludes `status` and `queue`.
    - Terminal app label is `Terminal` (not `Terminal Output`).
    - Top Worker icon row is centered.
    - App buttons are borderless and selected state uses filled accent style.
    - Active app icon container uses stronger filled color treatment.

