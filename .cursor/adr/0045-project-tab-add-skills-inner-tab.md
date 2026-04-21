# ADR 0045: Add Skills Inner Tab in Project Tab

## Status
Accepted

## Context
The project detail `Project` tab already includes focused inner tabs (`Project Files`, `Prompts`, `Rules`, `MCP`, `ADR`, `Agents`).  
Users requested a dedicated `Skills` tab in this same section so skill-related project workflows have a clear place in the UI.

## Decision
Add a new inner tab called `Skills` in `ProjectProjectTab`:
- Include `skills` in the allowed hash-driven tab values.
- Add a `Skills` tab trigger to the inner tab list.
- Add a `Skills` tab content panel with an initial section scaffold.

## Consequences
- The project details page now supports deep-link hash navigation to `#skills`.
- The tab structure is more explicit for skill-oriented workflows.
- Existing tabs and behavior remain unchanged.
