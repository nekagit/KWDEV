# ADR 0053: Ideas Tab Matches Milestones Table-First Layout

## Status
Accepted

## Context
The Ideas planner area still used nested accordions and a split two-panel composition, while Milestones already moved to a flatter table-first workflow with top action buttons. The mismatch created extra UI friction and inconsistent mental models between two closely related planner views.

## Decision
- Update `ProjectIdeasDocTab` to use a Milestones-like structure:
  - top action row with primary actions (`Refresh`, `Convert to milestones`, `Delete`, `Add idea`);
  - single table-focused content area for idea management;
  - selected-row behavior retained for action targeting.
- Remove accordion-based wrappers from the Ideas tab.
- Move add-idea input fields into a modal dialog opened from the top action row to keep the main surface table-first.

## Consequences
- Ideas and Milestones now share the same interaction pattern.
- Planner UI has less nested expand/collapse behavior and reduced visual noise.
- Users can focus on table operations and top-level actions without scanning multiple accordion sections.
