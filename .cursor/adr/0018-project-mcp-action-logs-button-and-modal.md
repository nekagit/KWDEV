# ADR 0018: Project MCP action logs button and modal

## Status

Accepted.

## Context

The Project -> MCP tab needed a visible, top-right logs entry point and traceability of user interactions within the section.

## Decision

1. Add a **Logs** button with icon at the top-right of the MCP section.
2. Add an **MCP action logs** modal to display recorded events.
3. Record all MCP section interactions in local UI logs, including:
   - load/refresh attempts and outcomes
   - save attempts and outcomes
   - snippet copies
   - modal open/close actions
   - logs modal open/close and clear actions
4. Keep logs in-memory for the current UI session and cap retained entries.

## Consequences

- Users can inspect MCP actions without leaving the page.
- Debugging and confidence improve for MCP configuration edits.
- Logs are session-local and not persisted to backend storage.
