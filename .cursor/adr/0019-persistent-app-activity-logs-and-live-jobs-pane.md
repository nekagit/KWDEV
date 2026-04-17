# ADR 0019: Persistent app activity logs with live jobs pane

## Status

Accepted.

## Context

Action logs were local to a single MCP view instance and were lost on refresh. Users also needed immediate visibility of active terminal runs and queued jobs next to logs.

## Decision

1. Introduce app-wide persistent activity logs in local storage via `src/lib/app-activity-log.ts`.
2. Emit log entries from shared run lifecycle paths (`run-store`, `run-store-hydration`) and MCP interactions.
3. Update MCP Logs modal to show:
   - persisted activity logs
   - current terminal runs/jobs (live from `useRunStore`)
4. Keep logs bounded (max retained entries) and session-safe.

## Consequences

- Logs survive refresh/reopen and combine events from multiple app areas.
- Users can inspect actions and current run queue in one place.
- No backend schema/migration is required for this logging layer.
