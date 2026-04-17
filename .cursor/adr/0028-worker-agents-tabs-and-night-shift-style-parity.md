# ADR 0028: Worker Agents Tab Restore and Night Shift Style Parity

## Status
Accepted

## Context
- The Worker tab `Agents` section drifted from the intended tab-based layout into collapsible panels.
- This created a UX mismatch versus the existing agent card patterns and made the Night Shift panel look inconsistent with the other agent surfaces.
- The expected interaction is one tab per agent area:
  - Testing Agent
  - Cleanup Agent
  - Refactor Agent
  - Night Shift

## Decision
- Restore tab navigation in `ProjectWorkerAgentsSection` using `Tabs`, `TabsList`, and `TabsContent`.
- Keep each agent area in its own tab, with `testing` as default.
- Keep the existing card internals (status badge, actions, output panel) and only change the section navigation model.
- Apply a dedicated gradient card style constant for Night Shift fallback content so it visually matches the agent card family.
- Centralize tab metadata and Night Shift style constants in `src/lib/project-worker-agents-layout.ts`.

## Consequences
- Agents section is again predictable and easier to scan, matching the original tabbed mental model.
- Night Shift fallback panel now has visual parity with other agent panels.
- The tab structure and Night Shift style are covered by unit tests in `src/lib/__tests__/project-worker-agents-layout.test.ts`.
