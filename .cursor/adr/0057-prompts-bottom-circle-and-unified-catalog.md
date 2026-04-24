# 0057 - Prompts Bottom Circle and Unified Catalog

## Status
Accepted

## Context

Prompts were previously managed inside the Setup inner tabs, which made prompt workflows harder to discover from the main project bottom-circle navigation. At the same time, the import experience only exposed a narrow subset of prompts and did not clearly represent all prompt origins across the repository.

The product requirement is to expose Prompts as a dedicated bottom-circle tab next to Setup and to provide visibility into every prompt source in the codebase, including:

- prompt files under `data/prompts/**`
- inline prompts embedded in API/UI/library code
- existing prompt records in the DB

## Decision

1. Add a dedicated `prompts` bottom-circle tab in project details, positioned next to `setup` in default ordering.
2. Remove the Prompts section from Setup inner tabs to avoid duplicate entry points.
3. Introduce a dedicated `ProjectPromptsTab` that includes:
   - project prompt management (`SetupEntityTableSection` for `prompts`)
   - a searchable codebase prompt catalog loaded from `/api/data/prompts/all-available`
4. Refactor `/api/data/prompts/all-available` to aggregate:
   - recursive files from `data/prompts`
   - inline prompt sources from a centralized registry (`src/lib/prompt-sources-inline.ts`)
   - DB prompt rows
5. Include `sourceType` and `sourcePath` metadata in catalog records so users can trace prompt origins.

## Consequences

### Positive
- Prompts become first-class in the project workflow and easier to access.
- Prompt visibility improves by unifying file-based, inline, and DB-backed sources.
- Prompt provenance is explicit via source metadata.

### Trade-offs
- Inline prompt coverage depends on maintaining the inline registry as new prompt callsites are added.
- Catalog payload size can grow as prompt files and inline sources increase.

## Alternatives Considered

- Keep Prompts in Setup and only expand import modal data:
  - Rejected because it does not satisfy navigation requirement for dedicated bottom-circle entry.
- Auto-discover inline prompts with heuristic code parsing at runtime:
  - Rejected for reliability and maintenance risk compared with explicit registry ownership.
