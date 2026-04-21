# ADR 0038: Unify Ideas and Milestones into Planner

## Status
Accepted

## Context
- Project bottom navigation previously exposed separate tabs for `Ideas`, `Milestones`, and `Planner`.
- Planning workflows are tightly connected: ideas evolve into milestones, and milestones drive tickets in planner board.
- Splitting these surfaces across separate tabs adds unnecessary navigation friction.

## Decision
- Remove standalone `Ideas` and `Milestones` entries from bottom project tabs in `src/components/organisms/ProjectDetailsPageContent.tsx`.
- Keep `Planner` as the single planning workspace and organize it with three sections:
  - Planner board
  - Ideas
  - Milestones
- Render all three within Planner via accordion sections for clearer structure and reduced tab switching.

## Validation
- `src/lib/__tests__/project-details-planner-unification.test.ts` asserts:
  - no `value: "ideas"` / `value: "milestones"` in tab definitions,
  - `ProjectIdeasDocTab` and `ProjectMilestonesTab` render inside Planner tab content.
- Existing bottom-tab style regression tests remain passing.

## Consequences
- Planning workflows are centralized in one location.
- Bottom navigation becomes simpler with fewer top-level choices.
- Users can move between board, idea, and milestone context without leaving Planner.
