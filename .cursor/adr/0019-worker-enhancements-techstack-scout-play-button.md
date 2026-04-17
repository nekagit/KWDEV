# ADR 0019: Worker Enhancements play button for tech-stack cleanup scout

## Status
Accepted

## Context
The Worker tab already has an `Enhancements` section that stores static analysis tool preferences and displays context references.  
The workflow was missing a one-click action to:
- analyze the current project codebase and detect the real tech stack,
- generate testing and cleanup guidance,
- suggest latest open-source GitHub projects relevant to that stack,
- recommend standard cleanup tools for ongoing quality work.

The user also requires `PROJECT.md` to be treated as the single source of truth for project structure.

## Decision
Add a play-style action in the `Enhancements` section (`Tools` tab) that starts an agent run using a dedicated prompt builder:
- New prompt helper: `src/lib/worker-enhancements-testing-prompt.ts`
- New button in UI: `WorkerEnhancementsSection` inside `src/components/organisms/Tabs/ProjectRunTab.tsx`
- The action runs via existing queue/start mechanics (`runTempTicket`) and uses the selected provider.

The generated prompt explicitly instructs the agent to:
1. read `PROJECT.md` as single source of truth,
2. analyze the current codebase tech stack,
3. produce cleanup/testing analysis,
4. include latest open-source GitHub projects,
5. include standard tools for cleanup categories.

Output is written to `worker-enhancements-testing-report.md` in the repo root.

## Rationale
- Reuses proven run pipeline and queue logic instead of introducing new orchestration paths.
- Keeps feature implementation minimal and testable via a pure prompt-builder unit.
- Aligns with AI-project best practices:
  - deterministic prompt contracts in code,
  - explicit output artifact path,
  - structured sections for downstream review,
  - source-of-truth anchoring to reduce hallucinated project assumptions.

## Consequences
### Positive
- Faster operator workflow: one click to launch a stack-aware cleanup research task.
- Better consistency of analysis output due to structured prompt contract.
- Compatible with existing terminal slot queue behavior and toasts.

### Trade-offs
- The quality of recommendations still depends on model/tooling access at run time.
- “Latest” open-source project discovery is delegated to the running agent context.

## Testing
- Added `src/lib/__tests__/worker-enhancements-testing-prompt.test.ts`
  - verifies `PROJECT.md` instruction,
  - verifies codebase + tech-stack analysis request,
  - verifies latest OSS GitHub projects + standard cleanup tools request.

