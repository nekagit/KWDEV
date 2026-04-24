# ADR 0059: Prompt Contract Hardening And Boundary Guards

## Status
Accepted

## Context
KWDEV relies on prompt-driven API generation and agent execution loops. Several routes accepted loosely structured model output and used regex extraction for JSON payloads. User-controlled content was embedded directly into prompts without explicit data boundaries, increasing reliability and prompt-injection risk.

The project direction in `PROJECT.md` emphasizes robust agent-driven execution and predictable runtime behavior, so prompt contracts need stronger guarantees.

## Decision
1. Add shared prompt contract utilities in `src/lib/prompt-contracts.ts`:
   - strict JSON parsing for object/array contracts
   - safe parse wrappers for route usage
   - untrusted input boundary section builder for prompt composition
2. Update generation routes to:
   - use shared strict parse helpers
   - retry once with explicit strict JSON reminder when parse fails
   - avoid regex-first extraction patterns
3. Add boundary wrappers around user-provided input in generation/analyze flows.
4. Add drift detection support for prompt source dual-representation:
   - `promptsHaveDrift(...)` in `src/lib/prompt-json.ts`
   - enforce drift checks in prompts initialization route
5. Resolve ask/execute mismatch in global project chat by aligning metadata with execution intent (`agentMode: "agent"`).

## Consequences
### Positive
- More reliable model-output parsing and clearer contract failures.
- Lower risk of untrusted text overriding instructions.
- Reduced silent drift risk between `.prompt.md` and `.prompt.json.source_markdown`.
- Better runtime semantics consistency for direct execution chat flow.

### Trade-offs
- Slightly more verbose route logic due to retry handling.
- Strict parsing may reject previously tolerated mixed-output model responses.

## Validation
- Added/updated unit tests:
  - `src/lib/__tests__/prompt-contracts.test.ts`
  - `src/lib/__tests__/generate-routes-prompt-hardening.test.ts`
  - `src/lib/__tests__/prompt-json.test.ts`
  - `src/lib/__tests__/prompts-initialize-drift-check.test.ts`
  - `src/lib/__tests__/global-project-chat-bubble-provider.test.ts`
- Targeted test run passed for all affected tests.
