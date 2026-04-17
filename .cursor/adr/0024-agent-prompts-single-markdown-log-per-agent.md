# ADR 0024: Single Markdown Log Per Agent

## Status
Accepted

## Context
Agent runs were creating too many markdown files per iteration, making repo hygiene and review harder.

## Decision
Adapt all worker-agent prompts to enforce one maintained markdown log per agent:

- Testing Agent: `TESTING.md`
- Cleanup Agent: `CLEANUP.md`
- Refactor Agent: `REFACTOR.md`

Each prompt now explicitly requires:
- maintain/update only the designated file for that agent,
- do not create any additional markdown files.

## Consequences

### Positive
- Predictable and centralized iteration history per agent.
- Less markdown clutter in repository root and feature folders.

### Trade-offs
- Single-file logs can grow large over time and may require periodic cleanup.

## Validation
- Prompt coverage tests:
  - `src/lib/__tests__/testing-agent-prompt.test.ts`
  - `src/lib/__tests__/worker-agent-prompts.test.ts`
