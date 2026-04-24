# ADR 0054: Planner Secondary Tabs Include Tickets Table View

## Status
Accepted

## Context
The Planner secondary section already provided `Ideas` and `Milestones` tabs with table-first management. Tickets were only visible in the Kanban area above, which forced users to switch interaction patterns when they needed quick row-based ticket actions.

## Decision
- Add a third secondary tab: `Tickets`.
- Implement `ProjectPlannerTicketsTab` as a table-first view backed by the same ticket + kanban-state data source used by the Kanban board (`fetchProjectTicketsAndKanban`).
- Provide ticket actions in this tab that mirror Kanban operations:
  - Move to in progress
  - Mark done
  - Redo
  - Delete (archive)
- Keep this tab in the same planner secondary tabs container as `Ideas` and `Milestones`.

## Consequences
- Planner secondary tabs now offer consistent table workflows across ideas, milestones, and tickets.
- Ticket status actions remain synchronized with Kanban because both views use the same API/state model.
- Users can manage tickets without relying only on card-based Kanban interaction.
