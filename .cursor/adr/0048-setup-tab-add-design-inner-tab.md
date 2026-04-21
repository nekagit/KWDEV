# ADR 0048: Add Design Inner Tab to Setup

## Status
Accepted

## Context
Project details already had a dedicated `Setup` bottom tab with inner tabs (`Prompts`, `Skills`, `Rules`, `MCP`, `ADR`, `Agents`).
Users requested that `Design` also be available directly inside this setup workflow.

## Decision
- Add `design` to setup inner-tab values in `ProjectProjectTab`.
- Add a `Design` tab trigger in the setup tabs row.
- Render `ProjectDesignTab` inside setup mode using the existing design UI with `showHeader={false}` to avoid duplicate section headers.

## Consequences
- Setup now includes first-class access to project design artifacts.
- Existing Project vs Setup separation remains unchanged.
- URL hash deep-linking and inner-tab sync now support `#design` in setup mode.
