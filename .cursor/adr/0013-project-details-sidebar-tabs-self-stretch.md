# ADR 0013: Project details — left sidebar tabs self-stretch for full-height scroll

## Status

Accepted.

## Context

On the project details page, the vertical left sidebar of section tabs is intended to feel like fixed chrome and provide scrolling when the number of tabs exceeds the available height.

In practice, the tab list could end up not stretching to the full height of the left column, which reduces the expected scroll area and can make the sidebar feel visually “short” next to the content.

## Decision

Update the section tabs container to **self-stretch** within its column so it fills the available height and its `overflow-y-auto` reliably provides full-height scrolling.

## Consequences

- The left sidebar tabs occupy the full column height, improving visual alignment with the content pane.
- Scrolling behavior is more predictable when the tab list exceeds the available vertical space.

