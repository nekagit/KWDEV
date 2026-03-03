# ADR 0003: Migrate data/ entity JSONs to SQLite

## Status

Accepted.

## Context

Entity data (projects, ideas, prompts, tickets, designs, architectures) was stored in `data/*.json` files. Ideas were already backed by SQLite with a one-time migration from `ideas.json`. Projects, prompts, tickets, designs, and architectures were read/written via file I/O in API routes, which made consistency and concurrency harder and left no single schema source of truth.

## Decision

- **All entity storage moves to SQLite** (`data/app.db` for Node/Next, same path for Tauri). No runtime reads or writes to `data/projects.json`, `data/prompts-export.json`, `data/tickets.json`, `data/designs.json`, or `data/architectures.json` for CRUD.
- **Tables added (Node)** in `src/lib/db.ts`: `projects`, `prompts`, `tickets`, `designs`, `architectures`. Row types exported for use across the app.
- **One-time migrations**: When a table is empty and the corresponding JSON file exists under `data/`, its contents are imported once. Migrations are idempotent and do not overwrite existing rows.
- **Data access layer**: `src/lib/data/projects.ts`, `prompts.ts`, `tickets.ts`, `designs.ts`, `architectures.ts`, `ideas.ts` use `getDb()` and expose get/create/update/delete. API routes call these modules instead of file I/O.
- **Tauri**: A `projects` table was added; `kv_store` key `"projects"` is migrated into it on first run. List/create/update/delete projects use the table. Other entities (prompts, tickets, designs) were already in Tauri’s schema.

## Entities and table names

| Entity      | Table          | Notes                                      |
|------------|----------------|--------------------------------------------|
| Projects   | `projects`     | JSON columns for id arrays, spec_files     |
| Ideas      | `ideas`        | Already existed; ideas.json migration kept |
| Prompts    | `prompts`      | id INTEGER, category, tags JSON           |
| Tickets    | `tickets`      | Global pool (project.ticketIds reference these) |
| Designs    | `designs`      | config JSON                                |
| Architectures | `architectures` | practices, scenarios, extra_inputs JSON |

Plan tickets (per-project) remain in `plan_tickets`; milestones in `milestones`; kanban state in `plan_kanban_state`.

## Consequences

- Single source of truth per runtime: all entity CRUD goes through the DB.
- Schemas for all entities live in the DB; no duplicate entity definitions in JSON files.
- Existing `data/*.json` files can remain on disk as backup or be removed; they are not read or written by the app after migration.
- Tests that assumed file-based projects/prompts/tickets may need to mock `getDb()` or use an in-memory SQLite DB.
