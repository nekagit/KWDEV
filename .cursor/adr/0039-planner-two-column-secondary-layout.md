# ADR 0039: Planner Secondary Sections Use Two-Column Grid

## Status
Accepted

## Context
- After unifying Ideas and Milestones into Planner, the section flow remained mostly stacked and visually noisy.
- Users requested a clearer organized layout with side-by-side structure.

## Decision
- Keep `Planner board` as the primary full-width section.
- Render `Ideas` and `Milestones` in a responsive secondary grid:
  - `grid-cols-1` on small screens
  - `lg:grid-cols-2` on large screens
- Add lightweight bordered containers around each secondary section for clearer separation.

## Validation
- `src/lib/__tests__/project-details-planner-unification.test.ts` now verifies:
  - planner secondary grid marker (`data-testid="planner-secondary-grid"`),
  - responsive grid class (`grid grid-cols-1 gap-4 lg:grid-cols-2`).

## Consequences
- Planner is easier to scan and operate.
- Ideas and Milestones remain in Planner but are now organized in a balanced two-column layout.
