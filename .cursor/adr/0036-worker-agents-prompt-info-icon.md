# ADR 0036: Prompt Info Icon in Worker Agents Section

## Status
Accepted

## Context
- In the Worker tab Agents section, users can run Testing and Cleanup + Refactor loops but cannot quickly inspect which runtime prompt each agent uses.
- Prompt files are JSON-primary and live under `data/prompts/*.prompt.json`, so discoverability in the UI improves operational confidence.

## Decision
- Add prompt metadata in `src/lib/project-worker-agents-layout.ts` via `getWorkerAgentPromptInfo(...)` for:
  - Testing Agent
  - Cleanup + Refactor Agent
- Render an info icon in each relevant agent header inside `src/components/organisms/Tabs/ProjectWorkerAgentsSection.tsx`.
- Show a tooltip with:
  - prompt title,
  - short purpose description,
  - exact prompt JSON path.
- Keep Night Shift unchanged (no prompt info metadata in this pass).

## Validation
- `src/lib/__tests__/project-worker-agents-layout.test.ts` asserts:
  - expected Testing prompt info metadata,
  - expected Cleanup + Refactor prompt info metadata,
  - `null` for Night Shift prompt metadata.

## Consequences
- Agents UI now exposes prompt source context in-place without adding extra panel clutter.
- Prompt path visibility reduces ambiguity when tuning or auditing worker-agent behavior.
