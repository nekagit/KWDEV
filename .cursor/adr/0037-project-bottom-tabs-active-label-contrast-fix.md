# ADR 0037: Ensure active project bottom-tab labels remain visible

## Status
Accepted

## Context
Active labels in the project bottom tab bar could become unreadable. The custom tab trigger used `data-[state=active]:text-white`, but its active fill color was provided as a plain `bg-*` class. The base `TabsTrigger` style includes `data-[state=active]:bg-background`, which has higher selector specificity than plain background utilities, so the active tab could render with a light background and white text.

## Decision
Move project tab active fill and glow styles to `data-[state=active]:*` variants in `ProjectDetailsPageContent` tab metadata (`activeFill`, `activeGlow`) and apply those classes unconditionally per tab definition.

## Consequences
- Active tabs always receive their intended colored background in active state.
- White active label/icon text keeps sufficient contrast against active tab backgrounds.
- A regression test now asserts active fill classes are defined with `data-[state=active]:bg-*` variants.
