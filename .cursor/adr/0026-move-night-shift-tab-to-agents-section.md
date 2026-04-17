# ADR 0026: Move Night Shift Tab to Agents Section

## Status
Accepted

## Context
Night Shift lived under the Vibing section, while operational agent workflows (Testing, Cleanup, Refactor) live under the Agents section. This split made agent operations less cohesive.

## Decision
Move Night Shift from Vibing tabs into Agents tabs:

- Add `Night Shift` tab to `ProjectWorkerAgentsSection`.
- Inject existing `WorkerNightShiftSection` content into the Agents tab panel.
- Remove Night Shift tab/content from `WorkerVibingSection`.
- Keep Night Shift behavior and loop logic unchanged.

## Consequences

### Positive
- Centralized worker-agent operations in one section.
- Cleaner Vibing scope (Asking, Planning, Fast, Debugging).

### Trade-offs
- Users accustomed to old Vibing location need a small habit adjustment.

## Validation
- Updated files:
  - `src/components/organisms/Tabs/ProjectWorkerAgentsSection.tsx`
  - `src/components/organisms/Tabs/ProjectRunTab.tsx`
