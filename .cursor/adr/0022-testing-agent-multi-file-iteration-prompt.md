# ADR 0022: Testing Agent Multi-File Iteration Prompt

## Status
Accepted

## Context
Testing Agent iterations were often too small (single-file or minimal edits), which reduced throughput and practical impact per run.

## Decision
Move testing prompt construction into a dedicated helper and strengthen iteration requirements:

- Require a short execution plan before edits.
- Require meaningful improvements across at least 3 files when possible.
- Explicitly discourage single tiny edits.
- Require test execution and a changed-files summary at the end.

## Consequences

### Positive
- Higher expected impact per Testing Agent iteration.
- More predictable, reviewable output for each run.
- Prompt behavior can now be tested in isolation.

### Trade-offs
- Some repos/situations may not always permit 3-file changes in every iteration.
- Stronger prompts can increase iteration duration.

## Validation
- Added tests in:
  - `src/lib/__tests__/testing-agent-prompt.test.ts`
