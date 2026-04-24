# ADR 0059: Strict Idea-Milestone-Ticket Interdependency

## Status
Accepted

## Context
Planner entities (`ideas`, `milestones`, `plan_tickets`) were partially linked but not strictly enforced end-to-end across both runtimes (Next.js API and Tauri DB commands). This allowed orphan records and drift between parent-child relationships.

The product now requires strong invariant guarantees:

- each idea must have at least one milestone and one ticket
- each milestone must belong to an idea
- each ticket must belong to a milestone and an idea
- relationship changes must propagate to related records
- operators need a discrepancy report with optional repair workflow

## Decision
Adopt strict interdependency rules at schema + service + UI layers, with Next.js and Tauri parity:

1. Harden schema:
   - `milestones.idea_id` is required and foreign-keyed.
   - `plan_tickets.milestone_id` and `plan_tickets.idea_id` are required and foreign-keyed.
   - delete behavior uses restrictive semantics for planner parent-child integrity.
2. Auto-generate dependencies:
   - creating an idea auto-creates one linked milestone and a templated ticket set.
3. Propagate updates:
   - milestone idea reassignment cascades ticket `idea_id` updates for that milestone.
   - operations that would orphan linked records are blocked.
4. Add integrity reporting:
   - project integrity report endpoint returns discrepancy counts.
   - repair endpoint aligns ticket idea linkage to milestone idea linkage.
   - Tauri exposes an integrity audit command for parity.
5. Add planner discrepancy UI:
   - new Planner secondary tab visualizes counts and discrepancies.

## Rationale
- DB constraints provide the strongest reliability boundary for AI-driven write flows.
- service-layer validation keeps error messages actionable and user-facing behavior predictable.
- report + repair loop enables operational visibility without requiring direct SQL access.
- cross-runtime parity avoids diverging behavior between web and desktop modes.

## Consequences
### Positive
- lower risk of orphaned planner entities
- consistent cardinality guarantees for reporting and automation
- safer iterative planning workflows
- clearer observability of relationship drift

### Trade-offs
- migration complexity when hardening existing data
- stricter deletes require explicit reassignment/cleanup workflows
- higher coupling between planner entity routes and integrity helpers

## Verification
- TDD coverage added/updated:
  - `src/lib/__tests__/database-model-hardening.test.ts`
  - `src/lib/__tests__/project-details-planner-unification.test.ts`
  - `src/lib/__tests__/planner-integrity-automation.test.ts`
- targeted Bun suite executed and passing for the above tests.
