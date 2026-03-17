# ADR 0005: Prompts inside Project tab with inner tabs (Rules, ADR, All, etc.)

## Status

Accepted.

## Context

The project detail page had a top-level **Prompts** tab alongside Project, Ideas, Milestones, Worker, Control, and Versioning. The **Project** tab showed an accordion of sections: Rules, Project Files, Run, ADR, Agents. Users wanted:

1. To move the Prompts tab into the Project tab (so Prompts are reached from Project, not as a sibling tab).
2. For each section (Rules, ADR, and the rest) to be available as its own tab inside the Project tab, plus an "All" view (the accordion), so they can jump to Rules, ADR, Prompts, Project Files, Run, or Agents directly.

## Decision

1. **Remove top-level Prompts tab**
   - The Prompts tab was removed from the project detail tab row (TAB_ROW_2 in `ProjectDetailsPageContent.tsx`). Prompts are no longer a top-level tab.

2. **Inner tabs inside the Project tab**
   - The Project tab content (`ProjectProjectTab`) now has a **tab row** with: **All**, **Rules**, **ADR**, **Prompts**, **Project Files**, **Run**, **Agents**.
   - **All**: Shows the existing accordion (all sections expandable/collapsible).
   - **Rules**, **ADR**, **Prompts**, **Project Files**, **Run**, **Agents**: Each shows only that section’s content in a single view, so users can open e.g. `#rules` or `#prompts` and land on that section without opening the accordion.

3. **URL hash**
   - The inner tab is synced to the URL hash (e.g. `#rules`, `#adr`, `#prompts`, `#project-files`, `#run`, `#agents`). When the inner tab is "All", the accordion’s open section is reflected in the hash for shareable links.

4. **Preference and deep links**
   - Project detail tab preference (`project-detail-tab-preference.ts`) already did not include `prompts` in `VALID_PROJECT_DETAIL_TABS`; no change required. Deep links to `?tab=prompts` are no longer valid; users open the Project tab and then the Prompts inner tab (or use `?tab=project#prompts` if we add support later).

## Consequences

- Prompts are always accessed from **Project → Prompts** (or **Project → All** and then the Prompts accordion section).
- Rules, ADR, and other sections have dedicated tabs inside Project, improving navigation and shareable URLs (e.g. `#rules`, `#adr`).
- The standalone `/prompts` page and command-palette entry remain for listing prompts without a project context.
