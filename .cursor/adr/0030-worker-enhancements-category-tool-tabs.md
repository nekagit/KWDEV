# ADR 0030: Worker Enhancements Category Tool Tabs

## Status
Accepted

## Context
- The Worker Enhancements card previously split content into `Tools` and `Context` tabs.
- `Context` duplicated information that is already available in other project/worker areas and made Enhancements less focused.
- The product direction for cleanup work is to offer a clear, categorized tool selection model for refactoring and code quality activities.

## Decision
- Remove the `Context` tab from Worker Enhancements.
- Replace the previous tab structure with five category tabs:
  - Code Quality
  - Design Patterns
  - Best Practices
  - Code Smells
  - Code Refactoring
- Keep each category as a selectable checklist, with `Best Practices` split into:
  - Senior Level
  - Smart Practices
- Persist selected checklist values per project under a dedicated config key: `cleanup_refactor_tools`.
- Keep the existing Tech Stack Cleanup Scout action in Enhancements.

## Consequences
- Enhancements is now focused on actionable cleanup/refactor tool targeting rather than mixed context browsing.
- Selection persistence is decoupled from static-analysis checklist config, avoiding cross-feature coupling.
- Future category or item updates are safer because the catalog is centralized and test-covered (`src/lib/worker-enhancements-tools.ts`).
