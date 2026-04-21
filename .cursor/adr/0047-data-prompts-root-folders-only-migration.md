# ADR 0047: data/prompts Root Is Folders-Only

## Status
Accepted

## Context
The `data/prompts` root accumulated mixed file types (`*.prompt.md`, `*.prompt.json`, `*-output.md`, templates, docs), making prompt asset management noisy and harder to scale.

## Decision
- Enforce a folders-only root under `data/prompts`.
- Move prompt assets into dedicated subfolders:
  - `data/prompts/workflows` for `*.prompt.md` and `*.prompt.json`
  - `data/prompts/outputs` for `*-output.md`
  - `data/prompts/templates` for prompt template JSON files
  - `data/prompts/docs` for documentation files
- Update runtime constants, tests, and user-facing path copy to the new locations.

## Consequences
- Root prompt directory stays clean and predictable.
- Runtime and tests reference explicit paths (`workflows`/`outputs`) instead of flat root assumptions.
- Existing tooling that walks `data/prompts` recursively continues to work with minimal behavior change.
