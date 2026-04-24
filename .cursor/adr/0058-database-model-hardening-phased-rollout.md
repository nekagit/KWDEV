# ADR 0058: Database Model Hardening (Phased)

## Status
Accepted

## Context
The project has grown from file/JSON-oriented storage into DB-first storage for planner, setup entities, and run execution history. The existing model allows rapid iteration but has integrity risks:

- relationship links stored in JSON text arrays
- weak domain constraints on status/priority/category fields
- read routes with mutation side effects
- multi-step run completion writes that can partially fail

This is high-risk for AI-assisted execution flows because autonomous loops produce frequent writes and retries; the system needs strict, explainable invariants.

## Decision
Adopt a phased hardening strategy that preserves API compatibility while moving integrity guarantees into the database:

1. Add DB-level constraints (`CHECK`) and high-value indexes.
2. Add normalized join tables for project relationships.
3. Keep compatibility reads while deprecating legacy relationship array writes.
4. Make run completion atomic via one transactional endpoint.
5. Remove destructive behavior from read endpoints.
6. Add an integrity-audit helper for orphan and enum drift detection.

## Rationale
- Database constraints are the most reliable enforcement boundary.
- Phased rollout reduces migration risk and avoids breaking UI/agent workflows.
- Atomic completion protects consistency between planner state and implementation log.
- Compatibility reads let old and new data coexist during migration windows.

## Consequences
### Positive
- fewer orphaned references
- safer concurrent writes
- easier relational querying/reporting
- clearer operational auditability for AI-generated changes

### Trade-offs
- additional migration and dual-path complexity
- temporary redundancy while compatibility mode is active

## Implementation Notes
- Constraints/indexes and join-table bootstrap are implemented in the TypeScript DB layer (`src/lib/db.ts`) and mirrored in Rust schema initialization (`src-tauri/src/db/schema.rs`).
- Project relationship reads now prefer normalized link tables with fallback to legacy arrays (`src/lib/data/projects.ts`).
- Run completion is routed through a transactional API (`src/app/api/data/projects/[id]/complete-run/route.ts`) and consumed by hydration flow (`src/store/run-store-hydration.tsx`).

## Verification
- Added regression tests in `src/lib/__tests__/database-model-hardening.test.ts`.
- Existing related tests for milestones/ideas and API projects remain green.

