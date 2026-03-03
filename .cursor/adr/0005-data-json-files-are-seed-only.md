# ADR 0005: data/*.json files are seed-only, not runtime storage

## Status

Accepted.

## Context

After ADR 0003, all entity data (projects, ideas, prompts, tickets, designs, architectures) lives in SQLite (`data/app.db`) with schemas. The `data/*.json` files (e.g. `ideas.json`, `projects.json`, `prompts-export.json`, `tickets.json`) still exist in the repo, which can suggest they are still the source of truth.

## Decision

- **Runtime source of truth**: All entity CRUD uses the database only. The app does not read or write `data/*.json` for normal operation.
- **Role of JSON files**: The JSON files in `data/` are **seed/backup data** only. They are read **once** at app startup when the corresponding table is **empty** (see `migrate*FromJson` in `src/lib/db.ts`). After the first successful migration, they are never used again for that runtime.
- **Keeping or removing**: The files may remain on disk as backup or seed for fresh installs; they may be moved to e.g. `data/seed/` for clarity; or they may be removed if seed data is provided by other means (e.g. template DB or seed script). No code change is required to delete them after migration has run, but migration paths would need updating if files are moved.

## Consequences

- Single place to look for “where is entity data?” → database and `src/lib/data/*.ts`.
- Confusion about “why are there still JSONs?” is resolved by documentation (this ADR and `data/README.md`).
- Optional cleanup: move JSONs to `data/seed/` and update migration paths in `src/lib/db.ts` if we want to make the seed-only role explicit in the folder layout.
