# Prompt JSON schema (from .prompt.md conversion)

Every `*.prompt.md` in `data/prompts` has a sibling `*.prompt.json` with the same content in structured form plus the full original markdown. No information is lost.

## Canonical JSON schema

Root object:

| Key | Type | Description |
|-----|------|-------------|
| `source_file` | string | Original `.prompt.md` filename (e.g. `fix-bug.prompt.md`). |
| `source_markdown` | string | **Full raw content** of the .prompt.md file. Guarantees zero information loss and allows round-trip. |
| `structured` | object | Parsed sections for tooling and UI (see below). |
| `prompt` | object | Runtime-oriented shape for templates (see below). |

### `structured` object

| Key | Type | Description |
|-----|------|-------------|
| `title` | string (optional) | First line or `# ...` heading. |
| `role_or_intent` | string (optional) | "You are an expert..." paragraph(s). |
| `context_and_conventions` | string (optional) | Section after "Context &" or "Context". |
| `checklist` | array | `{ phase?: string, items: string[] }` — 🎯 sections, with optional sub-phases (e.g. Phase 1: Planning). |
| `dos` | string[] | Items from ✅ Dos section. |
| `donts` | string[] | Items from ❌ Don'ts section. |
| `output_format` | object (optional) | `{ description?: string, target_file?: string, required_structure_markdown?: string }`. |
| `user_placeholder_note` | string (optional) | Text after final `---` (e.g. "Error / log information (pasted by user)"). |
| `references` | object (optional) | `{ file_refs?: string[], tables?: string }`. |

### `prompt` object

| Key | Type | Description |
|-----|------|-------------|
| `template` | string or array | Single string with `{{variables}}` or array of `{ role, content }`. |
| `template_variables` | string[] | Variable names (e.g. `["appended_content"]` when app appends ticket/error log). |
| `metadata` | object | `name`, `description`, `version`, `tags`, optional `usage_notes`, optional `cursor_mode`. |
| `client_parameters` | object (optional) | `temperature`, `max_tokens`. |
| `output_format` | object (optional) | For structured output: `description`, `schema` or `required_structure` reference. |

## Inventory (19 .prompt.md files)

| Filename | Purpose (cursor-paths) |
|----------|------------------------|
| analyze-project.prompt.md | Idea-driven flow |
| idea-to-milestones.prompt.md | Idea-driven flow |
| milestone-to-tickets.prompt.md | Idea-driven flow |
| implement-all.prompt.md | Worker / Run tab |
| fix-bug.prompt.md | Worker / Run tab |
| night-shift.prompt.md | Worker / Run tab |
| create.prompt.md | Night shift phase |
| implement.prompt.md | Night shift phase |
| refactor.prompt.md | Night shift phase |
| test.prompt.md | Night shift phase |
| debugging.prompt.md | Night shift phase |
| design.prompt.md | Setup / analyze |
| architecture.prompt.md | Setup / analyze |
| testing.prompt.md | Setup / analyze |
| documentation.prompt.md | Setup / analyze |
| project.prompt.md | Setup / analyze |
| ideas.prompt.md | Setup / analyze |
| frontend.prompt.md | Setup (frontend) |
| backend.prompt.md | Setup (backend) |

## Section taxonomy (per file)

All prompts use a subset of:

- **Title** — First line or `# ...`
- **Role / intent** — "You are an expert..." paragraph(s)
- **Context & conventions** — Optional block after first heading
- **Checklist** — 🎯 (sometimes with ### Phase N subsections)
- **Dos** — ✅ Dos
- **Don'ts** — ❌ Don'ts
- **Output format requirement** — Required structure, target file, fenced code block
- **User/app placeholder** — After final `---` (e.g. error log, ticket appended by app)
- **References** — File paths, tables
