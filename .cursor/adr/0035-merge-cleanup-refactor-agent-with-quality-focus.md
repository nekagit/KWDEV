# ADR 0035: Merge Cleanup and Refactor Agent with Quality Focus

## Status
Accepted

## Context
- The Agents section had separate Cleanup and Refactor loops with very similar lifecycle behavior.
- Users already define Quality focus in the Quality section and store selected tool ids in `cleanup_refactor_tools`.
- Running two separate agents for cleanup/refactor duplicated UI controls and split related output.

## Decision
- Merge Cleanup and Refactor into one `Cleanup + Refactor` agent tab.
- Keep the existing loop orchestration model (start, auto-replenish on run exit, stop prevents new iterations).
- Build each iteration prompt with combined cleanup/refactor intent and include selected Quality labels from `cleanup_refactor_tools`.
- Keep strict code-only scope in the merged prompt:
  - modify only code-related files,
  - do not modify `.md` files.

## Consequences
- Agent operations are simpler for users: one combined workflow instead of two independent loops.
- Prompt intent is better aligned with user-selected Quality priorities.
- Existing cleanup loop state and metadata remain reusable while refactor-specific UI surface is removed from the tab layout.
