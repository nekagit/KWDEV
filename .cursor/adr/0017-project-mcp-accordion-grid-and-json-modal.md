# ADR 0017: Project MCP tab with collapsible sections, 2-column grid, and JSON in modals

## Status

Accepted.

## Context

The Project -> MCP tab showed JSON inline (both project `mcp.json` and addable snippets), making the page dense and less scannable.

## Decision

1. Use collapsible accordions for all top-level MCP sections:
   - Current `.cursor/mcp.json`
   - MCPs you can add
2. Use a responsive 2-column grid for section layout on larger screens, with one column on smaller screens.
3. Remove inline JSON display from the tab body.
4. Show JSON only in modals opened via an info icon:
   - Project `.cursor/mcp.json` opens editable JSON modal.
   - Addable MCP snippets open read-only snippet modal.

## Consequences

- MCP tab is cleaner and easier to scan.
- Raw JSON is still fully accessible when needed, but out of the default flow.
- Existing MCP save and snippet-copy workflows remain available.
