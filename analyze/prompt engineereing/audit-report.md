# KWDEV Prompt Engineering Audit

This audit applies the checklist in `checklist.prompt-engineering.json` to the current state of KWDEV.

## Scope
- Runtime prompt flows and execution semantics
- Generation API contract quality and parser hardening
- Prompt safety and source-governance controls
- Tests and reliability signals

## Score Summary (1-10)

| Area | Score | Notes |
|---|---:|---|
| Output Contract Design | 8 | Contracts are now explicit in key generation routes, but output-mode metadata is not yet consistently formalized across all prompt surfaces. |
| Parser Reliability and Recovery | 8 | Shared strict parser + retry behavior exists; good reliability improvement over regex extraction. |
| Prompt Injection and Input Safety | 8 | Untrusted boundary blocks are implemented in critical routes; more coverage still possible in remaining prompt builders. |
| App-Purpose Alignment (Execution-First) | 8 | Ask/execute mismatch in global chat was corrected; execution-oriented wording is clearer. |
| Prompt Source of Truth and Drift Control | 7 | Pair validation and drift detection now exist; canonical single-authoring pipeline is still not fully implemented. |
| Reuse and Composability | 8 | Shared helper module is in place and reused in major routes; some residual duplication remains in prompt composition text. |
| Validation and Type Safety | 8 | Solid request validation and normalization in many routes; schema coverage can still be expanded for all generated response payloads. |
| Observability and Failure Diagnostics | 7 | Errors are generally actionable and include useful context; telemetry consistency could be improved. |
| Testing and Governance | 8 | New tests cover contract helpers, route hardening, and drift checks; broader behavioral integration tests are still limited. |

## Weighted Overall Score

**7.9 / 10**

This is a strong improvement from the prior baseline and indicates a production-credible prompt layer with remaining governance and unification opportunities.

## Evidence Highlights

- Shared strict contract helpers:
  - `src/lib/prompt-contracts.ts`
- Hardened generation routes:
  - `src/app/api/generate-ideas/route.ts`
  - `src/app/api/generate-architectures/route.ts`
  - `src/app/api/generate-prompt/route.ts`
  - `src/app/api/generate-project-from-idea/route.ts`
  - `src/app/api/generate-ticket-from-prompt/route.ts`
- Sensitive route boundary safeguards:
  - `src/app/api/analyze-project-doc/route.ts`
- Prompt drift checks:
  - `src/lib/prompt-json.ts`
  - `src/app/api/data/prompts/initialize/route.ts`
- Runtime mode alignment:
  - `src/components/organisms/GlobalProjectChatBubble.tsx`
- Supporting tests:
  - `src/lib/__tests__/prompt-contracts.test.ts`
  - `src/lib/__tests__/generate-routes-prompt-hardening.test.ts`
  - `src/lib/__tests__/prompts-initialize-drift-check.test.ts`
  - `src/lib/__tests__/prompt-json.test.ts`
  - `src/lib/__tests__/global-project-chat-bubble-provider.test.ts`

## Priority Recommendations

1. Establish a single canonical prompt authoring source and auto-generate derived artifacts.
2. Add explicit output-mode metadata (`json_only`, `markdown_doc_only`) to every cataloged prompt source.
3. Expand strict response-schema validation for all AI-generated payloads before persistence.
4. Add integration tests for end-to-end prompt execution flows and failure-retry behavior.
5. Add lightweight score re-audit automation on each major prompt/runtime change.

