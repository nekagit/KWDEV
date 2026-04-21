# ADR 0046: Add Setup Bottom Tab and Move Setup Sections

## Status
Accepted

## Context
Project details used a bottom circular navigation where `Project` included both file management and setup-oriented sections (`Prompts`, `Skills`, `Rules`, `MCP`, `ADR`, `Agents`).  
Users requested a dedicated bottom `Setup` circle to separate setup workflows from project-file workflows.

## Decision
- Add a new bottom circular tab value `setup` in `ProjectDetailsPageContent`.
- Keep `Project` bottom tab focused on `Project Files`.
- Move setup-oriented inner sections to render under `Setup`:
  - Prompts
  - Skills
  - Rules
  - MCP
  - ADR
  - Agents
- Extend project tab preference valid values to include `setup`.
- Implement this via `ProjectProjectTab` mode switching:
  - `mode="project"` => `Project Files` only
  - `mode="setup"` => setup sections only

## Consequences
- Bottom navigation has clearer separation of concerns.
- Existing setup functionality remains available, now grouped under `Setup`.
- Deep-link and saved-tab preference support now include `setup`.
