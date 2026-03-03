# Debugging "Internal Server Error" (500)

When you see **Internal Server Error** or **Something went wrong** in the app, follow these steps.

## 1. Check the terminal

The dev server logs the real error when an API route throws.

- Run `npm run dev` (or your start command) and watch the terminal.
- Trigger the failing action again (e.g. open the app, refresh, open a project).
- Look for lines like:
  - `API data load error: ...`
  - `Projects GET error: ...`
  - `Database: cannot create data dir at ...`
  - `Database: cannot open ...`

The message and stack trace there are the actual cause.

## 2. Check the data directory and DB

Most 500s in this app come from the SQLite DB used by the data API.

- **Location**: The app uses a `data` directory at project root (or `../data` from cwd). The DB file is `data/app.db`.
- **Ensure**:
  - `data` exists (it is created automatically by `getDb()` in `src/lib/db.ts` if possible).
  - The process has read/write permissions for `data/` and `data/app.db`.
  - No other process is locking `data/app.db` (e.g. another dev server or Tauri build).
- **If you use Tauri**: In production the app may use a different data path; check `getDataDir()` in `src/lib/db.ts` and your Tauri config.

## 3. Check the Network tab

- Open DevTools → Network.
- Reproduce the error and find the request that returns **500** (e.g. `/api/data`, `/api/data/projects`).
- Open the response: the JSON body should contain an `error` field with a short message. That message is also what the UI should show (or "Server error loading data" if it was normalized).

## 4. Common causes

| Cause | What you see in terminal / response | Fix |
|-------|-------------------------------------|-----|
| Missing or unwritable `data/` | `Database: cannot create data dir at ...` | Create `data/`, fix permissions, or fix `getDataDir()` cwd. |
| DB file locked or corrupted | `Database: cannot open ...` or SQLite errors | Stop other processes using `app.db`; if corrupted, backup and remove `app.db` (migrations will recreate it). |
| Native module (better-sqlite3) missing | Module not found or load error | Run `npm install`; ensure Node version matches the built module. |
| Migrations or schema mismatch | SQL errors in terminal | Check `src/lib/db.ts` migrations and that no code expects old schema. |

## 5. ADR

See [.cursor/adr/0002-internal-server-error-handling.md](adr/0002-internal-server-error-handling.md) for how we avoid surfacing generic "Internal Server Error" and what the app does on 500.
