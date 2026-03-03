# ADR 0006: Create idea or ticket from run history

## Status

Proposed.

## Context

KWCode’s Worker tab stores completed runs in History (label, output, duration) and supports export/copy/download. Ideas and tickets live in the database and are used by the Planner and “Generate project from idea.” There was no way to turn a run into an idea or ticket without manual copy-paste, so the loop from execution back to planning was broken.

## Decision

- **Feature:** Add “Create idea from this run” and “Add as ticket” actions to the Run tab’s History section.
- **Data:** Use existing `createIdea` and `createTicket`; link new items to the current project where the data model allows (e.g. project’s `ticketIds` / idea association).
- **Optional:** First version may use run label as title and truncated output as description; a later milestone can add an API that uses the agent to summarize run output into title + description.
- **Output:** Idea/ticket is created and user is notified; user can then use it in Ideas tab or Planner as today.

## Consequences

- Users can capture useful runs as ideas or tickets in one click, improving the execution → planning loop.
- Implementation stays within existing run-store, ideas/tickets data layer, and project context; no new persistence layer.
- Optional summarization API can be added later without changing the core UX.
