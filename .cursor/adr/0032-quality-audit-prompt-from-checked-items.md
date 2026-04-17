# ADR 0032: Quality Audit Prompt From Checked Items

## Status
Accepted

## Context
- The Quality section previously exposed a "tech stack cleanup scout" action.
- The desired behavior is a direct quality audit of the items the user checked in the Quality categories.
- The report needs measurable output: scores and concrete suggestions.

## Decision
- Replace the scout action with a Quality Audit action.
- Build the prompt from the currently checked Quality items (Code Quality through Code Refactoring).
- Require the agent to include every checked item in `quality-audit-report.md`.
- Require report structure to include:
  - per-item `Score (0-100)`,
  - findings,
  - suggestions,
  - overall score,
  - prioritized top suggestions.

## Consequences
- The action now directly reflects the user’s selected audit scope.
- Reports are more operational for decision-making because they contain explicit scores and prioritized suggestions.
- Prompt generation is test-covered to reduce regressions in required report content.
