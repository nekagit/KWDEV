# ADR 0016: Planner tab section order puts Kanban first

## Status
Accepted

## Date
2026-04-17

## Context
The Planner tab mixed two major sections:
- `Project Planner` (stats + Kanban board)
- `Planner Manager` (AI ticket generation and bulk actions)

The requested UX is to make Kanban the first thing users see at the top, with manager actions below it.

## Decision
Reorder the Planner tab section layout in `ProjectTicketsTab` so `Project Planner` renders above `Planner Manager`.

Add a small single-source helper, `src/lib/project-planner-layout.ts`, to define intended section order and test it in `src/lib/__tests__/project-planner-layout.test.ts`.

## Consequences
- Kanban and ticket status are immediately visible on opening Planner.
- Ticket generation and destructive bulk actions remain available but are visually secondary.
- Section order is now encoded in one reusable constant with a focused test to prevent regressions.
