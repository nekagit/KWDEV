# ADR 0014: Rules tab — Initialize all (essential) + data-driven checklist

## Status

Accepted.

## Context

The Project → **Rules** inner tab had one **Initialize** button per category (Design, Architecture, …). Teams wanted a single action to seed the **most important** rules across every category, with **one visible checklist** tied to repo data (not hard-coded only in React).

## Decision

1. **`data/rules/initialize-all-manifest.json`**
   - Declares `title`, `description`, and a `checklist` array: each row has `categorySlug`, `label`, `summary`, and `files` (paths relative to `data/rules`, e.g. `design/design-system.json`).
   - **Initialize all (essential)** copies **only** these listed files into `.cursor/rules`, preserving paths.
   - Per-category **Initialize** is unchanged: it still copies **every** `.json` rule file under that category from `data/rules` (and root for General).

2. **API `GET /api/data/cursor-rules-template`**
   - Parses the manifest from `data/rules/initialize-all-manifest.json` and returns it as `initializeAllManifest`.
   - Excludes the manifest file from the walked rule list so it is never copied as a Cursor rule.

3. **UI (Project → Rules)**
   - Shows manifest **title/description** and a single **Initialize all (essential)** button (no per-row checkboxes).
   - While a full init runs, per-category Initialize is disabled to avoid races.

## Consequences

- To change the “essential bundle” or checklist copy, edit **initialize-all-manifest.json** (and keep referenced JSON rule files in **data/rules**).
- Broader rule sets remain available via per-category **Initialize**.
- The manifest must stay valid JSON; invalid rows are skipped when building the parsed checklist server-side.
