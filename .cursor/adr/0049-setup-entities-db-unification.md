# ADR 0049: Setup Entities DB Unification

## Status
Accepted

## Context
The Setup area in project details had mixed UX and storage behaviors:
- `Prompts`, `Skills`, `Rules`, `MCP`, and `Agents` used different UIs.
- Several entities relied on file-based storage under `.cursor/*` and markdown/json artifacts.
- Users requested a unified prompts-like table UX and project-scoped DB persistence so each project keeps its own Setup data.

## Decision
- Standardize Setup entity UX to table-first CRUD for:
  - Prompts
  - Skills
  - Rules
  - MCP
  - Agents
- Persist Setup entities in DB per project:
  - `project_docs`: `setup_prompts`, `setup_skills`, `setup_rules`, `setup_agents`
  - `project_configs`: `setup_mcp_servers`
- Track one-time migration status in `project_configs` using `setup_migrations`.
- On first entity access for a project:
  - Import legacy file-based sources once (if DB namespace is empty).
  - Mark migration complete.
  - Continue with DB-only reads/writes afterward.
- Remove Setup runtime dependence on file-based initialize/export/edit flows for these entities.

## Consequences
- Setup behavior is consistent across entities.
- Data is isolated per project and no longer depends on markdown/json runtime storage for these entities.
- Legacy project content remains available through one-time import, minimizing transition friction.
