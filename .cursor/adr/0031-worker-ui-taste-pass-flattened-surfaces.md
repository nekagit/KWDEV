# ADR 0031: Worker UI Taste Pass with Flattened Surfaces

## Status
Accepted

## Context
- Even after prior color unification, the Worker tab still had layered card-within-card structures in a few places.
- The result felt visually heavy: too many nested borders, especially around terminal and section shells.
- Action affordances also mixed neutral and colorful styles in key control rows.

## Decision
- Apply a UI taste cleanup pass to flatten containers and reduce border stacking across the Worker tab.
- Keep one primary colorful surface per section and remove extra border shells where possible.
- Standardize key control buttons (collapse, terminal actions, Night Shift actions) to colorful gradients.
- Keep behavior unchanged while simplifying visual hierarchy.

## Consequences
- Cleaner composition and clearer section hierarchy.
- Better consistency between Agents, Night Shift, and Terminal Output controls.
- Less visual noise without removing information density.
