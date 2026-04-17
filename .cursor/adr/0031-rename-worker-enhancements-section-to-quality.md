# ADR 0031: Rename Worker Enhancements Section to Quality

## Status
Accepted

## Context
- The worker card previously displayed the section name `Enhancements`.
- After introducing category-based cleanup and refactoring tools, the section scope is quality-focused and the old label is less clear.

## Decision
- Rename the worker section label from `Enhancements` to `Quality` in the UI.
- Align user-facing action messaging with `Quality` naming (now used by the Quality audit run action).
- Keep existing internal identifiers and surface tokens unchanged for compatibility (`enhancements` IDs/classes remain stable).

## Consequences
- Worker navigation and card headings now match the section purpose more clearly.
- Existing internal references do not require migration because only user-facing labels/messages changed.
