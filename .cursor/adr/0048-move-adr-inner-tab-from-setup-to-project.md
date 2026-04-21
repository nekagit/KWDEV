# ADR 0048: Move ADR Inner Tab from Setup to Project

## Status
Accepted

## Context
The `ADR` inner tab was located under the `Setup` circle in project details.  
Users requested `ADR` to be grouped with the `Project` circle instead.

## Decision
- Move `ADR` from `Setup` mode to `Project` mode in `ProjectProjectTab`.
- Keep `Setup` focused on configuration-oriented sections (`Prompts`, `Skills`, `Design`, `Rules`, `MCP`, `Agents`).
- Keep `Project` focused on project-structure artifacts (`Project Files`, `ADR`).

## Consequences
- `ADR` becomes directly accessible from the `Project` circle.
- Existing ADR list rendering remains unchanged; only its tab grouping changes.
