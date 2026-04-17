# ADR 0029: Worker Section Colorful Surface Unification

## Status
Accepted

## Context
- The Worker tab had mixed visual treatments across top-level sections.
- The `Agents` section established a clear colorful gradient style, but adjacent sections (Status, Queue, Vibing, Enhancements, Terminal Output, Night Shift) were not fully aligned.
- The target UX is a cohesive section system where each card from Status through Terminal Output follows the same design language.

## Decision
- Introduce centralized Worker section surface classes in `src/lib/worker-run-layout.ts`.
- Define section-specific colorful gradient tokens under `WORKER_RUN_SECTION_SURFACE_CLASSNAME`.
- Apply those shared classes in `ProjectRunTab` for:
  - Status
  - Queue
  - Night Shift
  - Vibing
  - Enhancements
  - Terminal Output
- Add tests that assert colorful gradient surface coverage for all defined section surfaces.

## Consequences
- Worker sections now look visually consistent with the Agents design system while still preserving per-section color identity.
- Color/styling regressions are less likely because section surface classes are centralized and test-covered.
