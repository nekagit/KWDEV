# ADR 0034: JSON-Primary Worker Prompt Runtime

## Status
Accepted

## Context
Worker flows in KWDEV (Night Shift, circle phases, implement-all, fix-bug, and idea-driven automation) previously read prompt text directly from `data/prompts/*.prompt.md`.

This created two recurring problems:
- Runtime failures reported as generic "prompt is empty" even when prompt metadata existed in JSON.
- Drift risk between `.prompt.md` and `.prompt.json` files because the system did not enforce stem pairing.

The product now requires:
- Runtime to use JSON prompt payloads as canonical execution source.
- Markdown companions to remain available for editing workflows.
- Explicit validation that each prompt stem has both `.prompt.md` and `.prompt.json`.

## Decision
Adopt JSON-primary prompt loading for worker runtime paths:
- Runtime path constants in `src/lib/cursor-paths.ts` now point to `data/prompts/*.prompt.json`.
- Prompt text is extracted from `source_markdown` via `src/lib/prompt-json.ts`.
- Runtime readers use JSON-specific helpers in `src/lib/api-projects.ts`:
  - `readProjectPromptJsonOrThrow(...)`
  - `readProjectPromptJsonOrEmpty(...)`
- Prompt initialization (`src/app/api/data/prompts/initialize/route.ts`) validates `.prompt.md` / `.prompt.json` pair completeness per stem and fails fast with actionable messages.

## Consequences
### Positive
- Worker runtime uses one canonical prompt source format.
- Prompt parse and validation errors are explicit and actionable.
- Missing counterpart files are detected early during initialization.

### Trade-offs
- JSON parse failures now surface immediately in runtime paths that were previously permissive.
- Teams must maintain paired prompt files consistently.

## Implementation Notes
- Companion markdown files are still expected in `data/prompts` for authoring and review.
- Runtime behavior is intentionally strict for prompt JSON integrity to avoid silent empty-prompt runs.
