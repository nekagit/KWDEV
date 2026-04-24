# ADR 0056: Rules Tab Removes Category Sub-Tabs

## Status
Accepted

## Context
The Rules tab included nested category tabs (`Architecture`, `Testing`, `Security`) inside the Rules section. This added an extra navigation layer and made the Rules area feel heavier than other setup entities.

## Decision
- Remove category sub-tabs from the Rules tab UI.
- Render a single `SetupEntityTableSection` for `entityType="rules"` directly in the Rules tab.
- Keep existing setup navigation and entity behavior unchanged outside this Rules-tab simplification.

## Consequences
- Rules tab becomes flatter and quicker to scan.
- No inner tab switching is required to view rules in the Rules tab.
- Category-specific management is no longer exposed through nested tabs in this location.
