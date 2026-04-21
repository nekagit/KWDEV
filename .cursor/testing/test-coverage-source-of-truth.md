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

- `src/components/organisms/Tabs/ProjectRunTab.tsx` (Terminal section cleanup)
  - Regression coverage:
    - `src/lib/__tests__/worker-run-sections.test.ts`
    - `src/lib/__tests__/worker-run-layout.test.ts`
    - `src/lib/__tests__/worker-run-top-apps.test.ts`
  - Covered behavior:
    - Terminal section remains accessible from top Worker apps.
    - Worker top app interactions and section layout behavior continue to work after removing terminal header sub-sections.

- `src/components/molecules/Display/TerminalSlot.tsx`
  - Manual verification:
    - Header copy/download controls are icon-only while preserving `title` and `aria-label`.

- `src/components/organisms/ProjectDetailsPageContent.tsx` (bottom tabs surface cleanup)
  - `src/lib/__tests__/project-details-bottom-tabs-style.test.ts`
  - Coverage:
    - Bottom fixed project tabs do not use `bg-sidebar` gray background styling.
    - Bottom tab triggers use color-filled styling and remove previous gray muted hover/border pattern.

- `src/components/organisms/Tabs/ProjectWorkerAgentsSection.tsx` (agent prompt info icon)
  - Regression coverage:
    - `src/lib/__tests__/project-worker-agents-layout.test.ts`
  - Covered behavior:
    - Testing and Cleanup + Refactor agents expose prompt info metadata used by info-icon tooltips.
    - Night Shift intentionally has no prompt info metadata.

- `src/components/templates/AppShell.tsx` (top nav active style alignment)
  - Regression coverage:
    - `src/lib/__tests__/top-nav-style.test.ts`
  - Covered behavior:
    - Top navbar active navigation uses the same blue filled active treatment as project bottom tabs (`bg-blue-500/90` + white foreground).

- `src/components/organisms/ProjectDetailsPageContent.tsx` (planner unification)
  - Regression coverage:
    - `src/lib/__tests__/project-details-planner-unification.test.ts`
  - Covered behavior:
    - Ideas and Milestones are no longer separate bottom tabs.
    - Planner tab now contains organized sections for planner board, ideas, and milestones.
    - Planner secondary areas use a responsive two-column grid on large screens.

