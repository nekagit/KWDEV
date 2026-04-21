# ADR 0038: Add bottom Run tab and migrate runtime controls

## Status
Accepted

## Context
Project runtime controls were split across multiple surfaces:
- Run port input and frontend preview modal trigger were in the project details header.
- Script execution and inline terminal output were inside the Project tab's inner Run section.
- Worker remained a separate runtime-oriented surface.

This made the run workflow less discoverable and required switching contexts for related actions.

## Decision
- Add a dedicated bottom `Run` tab in project details.
- Keep existing bottom `Worker` tab unchanged.
- Move runtime controls into the new bottom `Run` tab:
  - Port selector with common presets plus custom input.
  - Frontend preview modal action ("Open running app").
  - npm scripts launcher (migrated from Project inner Run).
  - Collapsible inline terminal output section using `TerminalSlot`.
- Remove the inner `Run` tab from `ProjectProjectTab`.
- Extend persisted valid project-detail tab values to include `run`.

## Consequences
- Runtime actions (port + scripts + terminal + preview) are now centralized in one bottom tab.
- Project inner tab navigation becomes simpler and focused on project files/docs/rules/agents.
- Worker functionality and workflows are preserved without behavior changes.
- Existing run-store execution and terminal infrastructure are reused, reducing migration risk.
