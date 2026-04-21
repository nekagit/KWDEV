# ADR 0047: Bottom Circle Reordering via Drag and Drop

## Status
Accepted

## Context
Project detail navigation uses fixed bottom circular tabs. Users requested the ability to reorder these circles to match personal workflow preferences.

## Decision
- Add drag-and-drop behavior to bottom tab circles in `ProjectDetailsPageContent`.
- Persist the custom order in local storage with key:
  - `kwdev-project-bottom-tab-order`
- Keep existing tab values and active-tab behavior unchanged.
- Validate persisted order and auto-heal missing/unknown values by merging with current defaults.

## Consequences
- Users can personalize circle order without affecting tab content behavior.
- New tabs added in future still appear because persisted order is completed from defaults.
- Order is local to the current browser environment.
