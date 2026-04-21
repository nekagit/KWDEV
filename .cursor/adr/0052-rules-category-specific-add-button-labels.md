# ADR 0052: Rules Category-Specific Add Button Labels

## Status
Accepted

## Context
In the Rules category views (Architecture/Testing/Security), the primary action button always displayed a generic label (`Add Rule`), which did not reflect the current category context.

## Decision
- For rules views with an active category filter, render category-specific labels:
  - `Add Architecture Rule`
  - `Add Testing Rule`
  - `Add Security Rule`
- Use matching singular/empty-state labels in these filtered views.
- When creating/updating in a filtered rules view, default/persist the category from the active filter.

## Consequences
- Clearer contextual UX within rules category tabs.
- Reduced ambiguity about where new rules are being added.
