# ADR 0016: Milestones tab sections as collapsed accordions in a 2-column layout

## Status

Accepted.

## Context

The Milestones tab had always-expanded content blocks, which increased vertical scroll and made it harder to focus on a single section quickly.

## Decision

1. Convert Milestones tab main sections into accordions:
   - **Milestones**
   - **Content**
2. Keep those accordion sections **collapsed by default**.
3. Place the sections in a responsive **2-column grid** on large screens, with a single-column layout on smaller screens.

## Consequences

- The tab becomes more compact and scannable.
- Users can expand only the section they currently need.
- Existing behaviors (row selection, convert/edit/delete actions, markdown rendering) remain unchanged.
