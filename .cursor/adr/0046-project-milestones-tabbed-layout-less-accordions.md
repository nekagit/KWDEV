# ADR 0046: Milestones Layout Uses Tabs Instead of Nested Accordions

## Status
Accepted

## Context
The Milestones planner area used two adjacent accordion panels (list + content), which added unnecessary expand/collapse interaction for a workflow that is primarily switching between list selection and content review.

## Decision
- Replace milestone list/content accordion sections in `ProjectMilestonesTab` with a tabbed layout.
- Keep two clear tabs:
  - `Milestones`: table-first management view.
  - `Content`: selected milestone markdown/content view.
- Disable the `Content` tab when no milestone is selected.
- Preserve existing actions (convert to tickets, edit, delete, add milestone) without behavior changes.

## Consequences
- Fewer nested interactions and less visual noise.
- Faster transition between management and content reading.
- More consistent with tab-heavy navigation patterns already used across project details screens.
