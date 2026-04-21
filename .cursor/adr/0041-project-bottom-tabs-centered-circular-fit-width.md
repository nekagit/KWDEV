# ADR 0041: Project Bottom Tabs Centered Circular Layout

## Status
Accepted

## Context
- The project page bottom tabs previously stretched across full width and used rectangular triggers.
- The desired interaction is a compact centered control that uses circular tab buttons.

## Decision
- Render the bottom tab bar as a centered, fit-width floating container.
- Keep navigation buttons circular with fixed size (`size-11`) and icon-first presentation.
- Preserve accessibility labels via `sr-only` text for each tab label.

## Validation
- `src/lib/__tests__/project-details-bottom-tabs-style.test.ts` verifies:
  - centered placement (`left-1/2` with `-translate-x-1/2`),
  - fit-content width (`w-auto`),
  - circular visuals (`rounded-full`, `size-11`).

## Consequences
- Bottom tabs no longer stretch edge to edge.
- Visual style matches a compact circular navigation control.
