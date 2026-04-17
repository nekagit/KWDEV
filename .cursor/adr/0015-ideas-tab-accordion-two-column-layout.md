# ADR 0015: Ideas tab sections as collapsed accordions in a 2-column layout

## Status

Accepted.

## Context

The Ideas tab had fixed, always-expanded sections. This made the page longer than needed and reduced scanability when users wanted to focus on one part (for example only viewing the list or only adding a new idea).

## Decision

1. Convert major Ideas tab sections into accordions:
   - **Add idea**
   - **Ideas**
2. Keep both accordion sections **collapsed by default**.
3. Arrange the two sections in a responsive **2-column grid** on large screens, with a single-column fallback on smaller screens.

## Consequences

- Users can quickly expand only the section they need.
- The Ideas tab is visually denser and easier to scan on wider screens.
- Existing add/list/detail behavior remains unchanged inside accordion content.
