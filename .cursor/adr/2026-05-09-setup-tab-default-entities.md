# ADR: Setup tab — default starter entities per category

## Status
Accepted (2026-05-09)

## Context
Setup inner tabs (Architecture, Testing, Security, Skills, Design, Rules, MCP, Agents) showed empty tables for new or unmigrated projects, even though the UI expects editable seed content to demonstrate structure.

## Decision
- Add pure merge helpers in `setup-entity-starters.ts` that prepend stable-id starter rows when categories or stores are empty.
- **`ensureSetupEntityMigrated`** always runs **`applyDefaultStarters`** after migration bookkeeping so existing migrated projects still receive missing starters on next tab load.
- Rules: five categories (`architecture`, `testing`, `security`, `design`, `general`). Skills: two named entries. MCP: one JSON template when no MCP rows exist. Agents: one markdown starter when no agents exist. Prompts entity path unchanged (not used by current Setup top tabs).

## Consequences
- Idempotent merges avoid duplicates when a category or skill name already exists.
- Users may delete starters; reappearing happens only if the category slot is empty again on a later load.
