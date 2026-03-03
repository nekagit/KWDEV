# ADR 0001: Unused `src/` files analysis and deletion plan

## Status

Accepted.

## Context

After removing the AI Bots and Server features and simplifying the dashboard, the codebase may contain files that are no longer reachable from app entry points. Unused code increases maintenance cost, confuses contributors, and can cause false positives in refactors. We need a repeatable way to identify and safely remove unused files.

## Decision

1. **Analysis**
   - Use an import-graph-based analysis from all Next.js entry points (`app/**/page.tsx`, `app/**/layout.tsx`, `app/**/route.ts`).
   - Treat any `.ts`/`.tsx` under `src/` not reached by static imports as "unused" for the purpose of cleanup.
   - Document results and caveats (dynamic imports, Next.js convention files, test files, type declarations) in `.cursor/unused-src-analysis.md`.

2. **Deletion plan**
   - Maintain a phased deletion plan in `.cursor/unused-src-deletion-plan.md`.
   - Do not delete: Next.js error boundaries (`app/error.tsx`, `app/global-error.tsx`) and files used only via dynamic import (e.g. `lib/noop-tauri-api.ts`).
   - Review type declaration files (`types/*.d.ts`) and dashboard/types used only by removed features before deletion.
   - Optional: remove test files under `lib/__tests__/` for removed or unused code.
   - Run build, lint, and tests after deletions to verify.

3. **Execution**
   - Deletions are performed in phases (lib → components → data/root → types → optional tests). Verification steps are run after changes.

## Consequences

- Single source of truth for "what is unused" and "what to delete" in `.cursor/`.
- Safer cleanup: framework and dynamic-import usage are preserved; types are reviewed.
- Optional test removal allows either keeping tests for future use or reducing noise from tests for removed features.
