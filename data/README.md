# data/

This directory holds app data. **Entity storage is in the database**, not in JSON files here.

## data/rules

**data/rules** holds JSON Cursor rule files. The project Rules tab **Initialize** button copies only from this folder into a project’s `.cursor/rules` (JSON format, not .mdc). Add `.json` files here to make them available for Initialize.

## Database (source of truth)

- **`app.db`** (created at runtime in the app data directory, e.g. `data/app.db` when running from repo) is the single source of truth for:
  - projects, ideas, prompts, tickets, designs, architectures  
- All CRUD goes through SQLite; see `src/lib/db.ts` and `src/lib/data/*.ts`.

## Seed JSON files

Seed JSON files have been removed. The app still supports one-time migration from `data/ideas.json`, `data/projects.json`, etc. if you add them (e.g. for a custom seed). By default, new installs start with an empty DB; use the template/seed flow in the app if you need initial data. See ADR 0003 and ADR 0005.
