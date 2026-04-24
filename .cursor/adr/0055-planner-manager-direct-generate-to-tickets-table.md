# ADR 0055: Planner Manager Generates Tickets Directly Into Table

## Status
Accepted

## Context
Planner Manager previously generated a temporary ticket preview block that required a second confirmation step before the ticket appeared in backlog/table views. This created extra friction and did not match the desired table-first planner workflow.

## Decision
- Change Planner Manager `Generate ticket` flow to directly create the generated ticket in backlog.
- Keep milestone/idea linkage automatic by defaulting to:
  - `General Development` milestone/idea when available;
  - otherwise first available milestone/idea entries.
- Remove the generated-ticket confirmation UI block from Planner Manager.
- Clear the prompt input after successful direct add.

## Consequences
- Generated tickets appear immediately in ticket table/Kanban data.
- Planner Manager UI stays minimal (input + generate action).
- Users no longer need an extra confirmation step to persist generated tickets.
