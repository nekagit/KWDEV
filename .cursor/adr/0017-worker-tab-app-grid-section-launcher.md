# ADR 0017: Worker tab uses app-grid section launcher

## Status
Accepted

## Date
2026-04-17

## Context
The Worker tab previously used stacked accordions for top-level sections. The desired interaction is closer to an app launcher experience (App Store style): show a grid of section "apps", and open the selected section as a card only when clicked.

## Decision
Replace top-level accordion navigation in `ProjectRunTab` with:
- an app-style icon tile grid for section selection
- single-section detail card rendering below the grid
- toggle behavior: clicking the active tile collapses the detail view

Sections covered:
- Status
- Queued Tasks
- Agents
- Vibing
- Enhancements
- Terminal Output

## Consequences
- Worker tab starts in a fully collapsed state by default.
- Navigation is visually faster and more compact for many sections.
- Focus remains on one section at a time, reducing on-screen clutter.
