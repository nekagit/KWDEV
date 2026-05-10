# ADR: Tauri `milestones_ideas` compile fix (query types + transaction match)

## Status
Accepted (2026-05-09)

## Context
`npm run tauri -- dev` failed to compile the `run-prompts` crate: `rusqlite::query_row` for `MAX(number)` lacked an explicit column type, producing inference errors; the post-transaction `match` mixed `usize` (from `execute`) with unit type expectations; using `last_insert_rowid()` after commit was ambiguous when the inserted idea id was already known from the closure.

## Decision
- Annotate the scalar query as `row.get::<_, i64>(0)`.
- Commit/rollback via `match` that returns the inserted `idea_id` from the inner transaction closure and uses `execute` only for side effects (`?` with block body).
- Drop reliance on `last_insert_rowid()` for the follow-up SELECT after idea creation.

## Consequences
- `create_idea` again compiles and returns the correct idea row after COMMIT.
- Desktop dev (`tauri dev`) can complete the Rust build alongside `beforeDevCommand` Next.js readiness.
