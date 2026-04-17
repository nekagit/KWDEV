# ADR 0025: Worker Agents Code-Only Scope (No Markdown Edits)

## Status
Accepted

## Context
Worker agents (Testing, Cleanup, Refactor) were previously instructed to maintain markdown logs, which conflicted with the desired behavior of keeping agents focused strictly on code changes.

## Decision
Update all worker-agent prompts to enforce code-only scope:

- Agents may modify only code-related files:
  - source files,
  - test files,
  - code tooling/config files required for build/test/lint flows.
- Agents must not modify any `.md` files.

This applies to Testing, Cleanup, and Refactor agents.

## Consequences

### Positive
- Agent output remains focused on executable code quality.
- Prevents documentation churn from autonomous loops.

### Trade-offs
- Iteration narrative/progress in markdown is no longer maintained by agents.

## Validation
- Prompt tests cover the new constraints:
  - `src/lib/__tests__/testing-agent-prompt.test.ts`
  - `src/lib/__tests__/worker-agent-prompts.test.ts`
