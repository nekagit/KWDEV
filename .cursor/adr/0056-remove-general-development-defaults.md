# ADR 0056: Remove General Development Defaults

## Status
Accepted

## Context
The planner workflow auto-created and auto-preferred a `General Development` milestone and idea in both API and Tauri paths.
This created unwanted records and forced defaults that users did not explicitly request.

## Decision
- Stop auto-creating `General Development` in milestone and idea listing endpoints.
- Remove UI logic that prioritizes or auto-selects `General Development`.
- Use first available milestone/idea where fallback selection is needed.
- Clean up legacy `General Development` records on list reads to prevent reappearance.

## Consequences
- New projects no longer get hidden default planning entities.
- Users fully control milestone and idea naming.
- Existing legacy `General Development` rows are removed automatically when related lists load.
