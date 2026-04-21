# ADR 0050: Setup Top Tabs Switched to Architecture, Testing, Security

## Status
Accepted

## Context
Users requested the Setup top row to directly expose `Architecture`, `Testing`, and `Security`, and to remove the other tabs from that row.

## Decision
- Replace Setup top tabs with:
  - Architecture
  - Testing
  - Security
- Remove the former Setup top tabs (`Prompts`, `Skills`, `Design`, `Rules`, `MCP`, `Agents`) from this surface.
- Back these three tabs with `rules` records filtered by category.

## Consequences
- Setup matches the requested information architecture.
- Rules content remains editable in the same CRUD table component, scoped by category.
