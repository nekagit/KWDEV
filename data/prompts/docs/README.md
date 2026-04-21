# data/prompts

This folder holds all prompt assets used by the app (worker, night shift, analyze, idea-driven flow). The app reads canonical paths from `src/lib/cursor-paths.ts` (e.g. `data/prompts/workflows/analyze-project.prompt.md`).

## Subfolders

- `workflows/` - runtime prompt pairs (`*.prompt.md` and `*.prompt.json`)
- `outputs/` - generated output artifacts (`*-output.md`)
- `templates/` - reusable prompt template JSON files
- `docs/` - prompt structure documentation

## File types

- **`workflows/*.prompt.md`** — Markdown prompts run by the agent (night shift, fix-bug, analyze-project, etc.).
- **`workflows/*.prompt.json`** — Structured JSON version of each `*.prompt.md` with the same stem.
- **`outputs/*-output.md`** — Output files written by the agent (e.g. `idea-analysis-output.md`, `milestones-output.md`, `tickets-output.md`).

## JSON prompt files (from .prompt.md)

Every `*.prompt.md` has a sibling `*.prompt.json` with:

- **`source_file`** — Original .prompt.md filename.
- **`source_markdown`** — Full raw content of the .md (guarantees zero information loss; use for round-trip or diff).
- **`structured`** — Parsed sections: title, role_or_intent, context_and_conventions, checklist, dos, donts, output_format, user_placeholder_note.
- **`prompt`** — Runtime template (single string with optional `{{appended_content}}`), template_variables, metadata, client_parameters.

The app still lists and reads **`.prompt.md`** by default. The JSON files are used for tooling, UI, or future “serve from JSON” support. To regenerate JSON from .md, run: `node script/prompts/md-to-json-prompts.mjs`.

## JSON prompt templates (reference)

Two example JSON files define a **best-practice prompt template format** you can use when creating or converting prompts:

| File | Purpose |
|------|--------|
| **`prompt-template-example.json`** | Full template: OpenAI-style **messages** array, `template_variables`, `metadata`, `client_parameters`, plus optional **task** / **output_format** for structured outputs. Aligns with [prompt_templates](https://moritzlaurer.github.io/prompt_templates/) and structured JSON prompting (2025). |
| **`prompt-template-simple-example.json`** | Minimal template: **single string** with `{{placeholders}}` and `template_variables`. Use this when your prompt is one block (like most `*.prompt.md` here). |

### Standard structure (summary)

- **`prompt`** (required) — Top-level key; file is a prompt template.
- **`template`** — Either a string with `{{variables}}` or an array of `{ "role": "system"|"user"|"assistant", "content": "..." }`.
- **`template_variables`** — List of variable names to populate (e.g. `["task", "context"]`).
- **`metadata`** — `name`, `description`, `version`, `tags`, optional `sources` / `usage_notes`.
- **`client_parameters`** (optional) — e.g. `temperature`, `max_tokens`.
- **`task`** / **`output_format`** (optional) — For structured prompting: describe the task and required output shape/schema.

Use these JSON files as references when designing new prompts or when converting existing `*.prompt.md` content into a structured JSON template.
