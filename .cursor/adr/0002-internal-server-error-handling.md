# ADR 0002: Internal Server Error handling and debugging

## Status

Accepted.

## Context

Users may see "Internal Server Error" when the app fails (e.g. API returns 500 or an error boundary catches a generic error). The phrase is unhelpful and does not point to root cause. Common causes in this app:

- Database not available: `data/` missing, `data/app.db` not writable, or `better-sqlite3` failing.
- First request to `/api/data` or `/api/data/projects` triggers `getDb()` and migrations; any throw becomes a 500.

We want: (1) APIs to always return a JSON body with a clear `error` field on failure, (2) no generic "Internal Server Error" string in API responses when we can provide a better message, (3) error boundary and client to guide users to check terminal and data dir when appropriate.

## Decision

1. **API routes (data)**
   - Catch blocks in `/api/data` and `/api/data/projects` normalize the error message: if the caught message is literally "Internal Server Error", replace it with a short actionable message (e.g. "Failed to load data (check data dir and terminal)").
   - Always return `NextResponse.json({ ..., error: string }, { status: 500 })` on failure so the client can show the message via `getApiErrorMessage()`.

2. **Client**
   - `getApiErrorMessage()` in `src/lib/utils.ts` already maps response body `error`/`detail` and normalizes "Internal Server Error" to "Server error loading data". No change required beyond ensuring APIs send a proper JSON `error` field.

3. **Error boundary**
   - `src/app/error.tsx` treats "Internal Server Error" and "Server error loading data" as internal server errors and shows a hint: check the terminal and ensure `data` dir exists and `data/app.db` can be created or opened.

4. **Documentation**
   - `.cursor/internal-server-error-debugging.md` documents how to reproduce and debug 500s (terminal logs, data dir, DB).

## Consequences

- Users see actionable messages instead of raw "Internal Server Error" when the app or API fails.
- Debugging path is documented; future 500s can be traced via terminal and data dir checks.
