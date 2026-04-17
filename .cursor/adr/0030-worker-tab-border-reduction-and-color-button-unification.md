# ADR 0030: Worker Tab Border Reduction and Color Button Unification

## Status
Accepted

## Context
- The Worker tab accumulated nested card containers and repeated border layers, especially in Agents and Night Shift.
- Visual density made the UI feel noisy and fragmented.
- Action buttons were mixed between ghost/outline/plain styles, which reduced visual consistency across the Worker flow.

## Decision
- Reduce visual nesting by removing or softening inner borders across Worker panels and loop output blocks.
- Keep one clear section surface per module and rely on subtle gradient backgrounds instead of stacked bordered cards.
- Unify action buttons to colorful gradient styles for start/stop/clear and terminal actions, while preserving disabled behavior.
- Apply this consistently to:
  - Agents section tabs (Testing, Cleanup, Refactor, Night Shift)
  - Night Shift controls in Worker
  - Terminal Output command/actions
  - Shared `WorkerAgentCard` used by Vibing subsections

## Consequences
- Cleaner hierarchy with fewer border collisions and better readability.
- Consistent colorful interaction style across the complete Worker tab.
- Lower risk of style drift by centralizing section surfaces and using shared class patterns.
