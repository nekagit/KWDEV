# ADR 0051: Restore Setup Top Tabs and Scope Rules Categories

## Status
Accepted

## Context
Setup top tabs were reduced to only `Architecture`, `Testing`, and `Security`, which removed previously available setup sections and caused missing functionality in the Setup surface.

## Decision
- Restore Setup top tabs:
  - Prompts
  - Skills
  - Design
  - Rules
  - MCP
  - Agents
- Keep `Architecture`, `Testing`, and `Security` as category tabs **inside** the `Rules` top tab.

## Consequences
- The full Setup workflow surface is restored.
- Rules remain focused by category without collapsing other setup areas.
