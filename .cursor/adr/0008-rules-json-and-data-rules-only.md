# ADR 0008: Rules as JSON; initialize only from data/rules

## Status

Accepted.

## Context

Cursor rules were previously provided as .mdc (or .md) and the Initialize flow could read from the app’s `.cursor/rules` or from built-in rules. Users wanted rules in JSON format and a single, explicit source for initialization.

## Decision

1. **JSON format**
   - Rule files are JSON (not .mdc). Shape: `description`, `globs`, `alwaysApply`, `content`.
   - The project’s `.cursor/rules` is seeded with these JSON files (e.g. `typescript-exhaustive-switch.json`).

2. **data/rules only**
   - Add a **data/rules** folder in the repo. Initialize reads **only** from `data/rules` (no app `.cursor/rules`, no built-in fallback).
   - The API `GET /api/data/cursor-rules-template` uses the same data-dir resolution as other data APIs (cwd/data or ../data) and returns only `.json` files under `data/rules`.

3. **Initialize behavior**
   - Initialize copies each file from the API response into the project’s `.cursor/rules` with the same name and content (JSON). Button title clarifies: “Copy JSON rules from data/rules into the project’s .cursor/rules”.

## Consequences

- Rules are JSON; add or edit rule files in **data/rules** to change what Initialize copies.
- Empty or missing **data/rules** returns no rules; the UI shows “No rules to copy” when appropriate.
- Built-in .mdc rules were migrated to **data/rules** as JSON (e.g. typescript-exhaustive-switch.json, no-inline-imports.json, code-style.json).
