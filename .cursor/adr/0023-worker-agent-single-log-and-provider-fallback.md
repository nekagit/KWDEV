# ADR 0023: Single Agent Iteration Logs and Provider Fallback

## Status
Accepted

## Context
Worker agents were producing too many markdown files and could stall when the selected provider was unavailable at runtime. This caused loop interruptions and inconsistent operator experience.

## Decision
1. **Single iteration log file per agent**
   - Testing Agent must append/update `.cursor/worker-logs/testing-agent-iterations.md`.
   - Cleanup Agent must append/update `.cursor/worker-logs/cleanup-agent-iterations.md`.
   - Refactor Agent must append/update `.cursor/worker-logs/refactor-agent-iterations.md`.
   - Prompts explicitly discourage creating many markdown reports.

2. **Provider fallback in queued run execution**
   - If queued worker-agent run fails because provider (`claude` or `gemini`) is unavailable, queue execution retries once with `cursor`.
   - Adds an internal retry guard (`providerFallbackTried`) to avoid infinite fallback loops.

## Consequences

### Positive
- Less markdown-file sprawl.
- Agent loops remain operational even when a selected provider is not installed/available.
- Better reliability of continuous loop behavior.

### Trade-offs
- Provider fallback may run under a different model/provider than initially selected.
- Error pattern matching for “unavailable provider” remains heuristic and may need future tuning.

## Validation
- Prompt tests updated:
  - `src/lib/__tests__/testing-agent-prompt.test.ts`
