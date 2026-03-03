# ADR 0004: Company page — Karaweiss and KWCode content

## Status

Accepted.

## Context

The Company page was a placeholder. We needed useful, accurate information about the organization (Karaweiss / karaweiss.org) and the product (KWCode) for users of the app.

## Decision

- **Company section:** Describe Karaweiss as the organization behind KWCode and link to karaweiss.org.
- **Product section:** Describe KWCode using data from the codebase: app identifier from `src-tauri/tauri.conf.json`, feature set from routes and components (projects, ideas, prompts, AI bots, server dashboard, GitHub, etc.), and stack (Next.js, Tauri, SQLite, Tailwind).

## Consequences

- Users see a single place for company and product info.
- Content is derived from the app and config; no external fetch required.
- Link to karaweiss.org is provided for further details.
