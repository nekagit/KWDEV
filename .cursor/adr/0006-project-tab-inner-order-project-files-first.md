# ADR 0006: Project tab inner tabs order — Project Files first, then Run, Prompts, Rules

## Status

Accepted.

## Context

Inside the **Project** tab (project details), inner tabs and the "All" accordion had no user-defined priority. The previous order was: **All**, **Rules**, **ADR**, **Prompts**, **Project Files**, **Run**, **Agents**. Users wanted a consistent, task-oriented order with project files and run first, then prompts and rules.

## Decision

1. **Inner tab order**
   - Inner tabs in `ProjectProjectTab` are now ordered: **Project Files**, **Run**, **Prompts**, **Rules**, **All**, **ADR**, **Agents**.
   - `INNER_TAB_VALUES` and the `TabsTrigger` list were updated to this order so Project Files is the first tab.

2. **Accordion order (All view)**
   - When the "All" tab is selected, accordion sections appear in the same priority order: **Project Files**, **Run**, **Rules**, **ADR**, **Agents** (Prompts has no accordion section; it is tab-only).
   - `ACCORDION_VALUES` and the default `openSection` were set so the first section is **project-files** instead of **rules**.

3. **URL hash**
   - Hash values (`#project-files`, `#run`, `#prompts`, `#rules`, etc.) are unchanged; only the visual order of tabs and accordion items changed.

## Consequences

- Project Files and Run are the first things users see in the Project tab, matching common workflows (browse files, run scripts).
- Prompts and Rules follow, with All, ADR, and Agents last.
- Default open section in "All" is now Project Files instead of Rules.
