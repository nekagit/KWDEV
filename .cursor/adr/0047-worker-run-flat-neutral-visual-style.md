# ADR 0047: Worker Run Flat Neutral Visual Style

## Status
Accepted

## Context
The Worker tab (notably `Agents` and `Vibing`) used saturated accent colors and gradient containers that made the interface feel visually heavy.
User feedback requested a calmer presentation with no gradients and lower color intensity.

## Decision
- Replace gradient-based Worker section surfaces with flat neutral surfaces via `WORKER_RUN_SECTION_SURFACE_CLASSNAME`.
- Update `Agents` and `Vibing` wrappers to use neutral backgrounds and border tokens (`border-border/60`, `bg-muted/30` or `bg-card`).
- Tone down icon containers and icon colors to neutral foreground variants.
- Replace colorful/gradient primary action buttons in these sections with a consistent solid foreground button style.
- Keep existing layout, spacing, and behavior unchanged; only visual treatment is adjusted.

## Consequences
- Worker UI is visually quieter and easier to scan.
- Styling becomes more theme-aligned by relying on shared semantic tokens instead of hardcoded accent gradients.
- Existing behavior, tab structure, and agent loop logic remain unchanged.
