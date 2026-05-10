# ADR: Running app preview — system browser fallback for blocked iframes

## Status
Accepted (2026-05-09)

## Context
The Run tab “Open running app” modal used an iframe pointing at `localhost:<port>`. Users reported a blank embed while the app worked in an external browser. Typical causes: **X-Frame-Options**, **Content-Security-Policy `frame-ancestors`**, and similar headers from Next.js, Vite, and other dev servers that forbid embedding.

## Decision
- Normalize preview URLs to **`http://127.0.0.1:<port>/`** via `buildRunningAppPreviewUrl` for iframe, links, and shell open.
- Add Tauri command **`open_external_url`** (Rust `open` crate) restricted to `http://` / `https://`, and surface a primary **“Open in default browser”** action in the modal (with toast on success in Tauri).
- Keep the iframe as an optional convenience; show an **Alert** explaining why embeds are often blank and steering users to browser actions—especially in the desktop shell.

## Consequences
- Users get a reliable path to the running project without misattributing blanks to KWDEV bugs alone.
- Small dependency: crates.io `open`.
