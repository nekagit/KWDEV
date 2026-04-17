# ADR 0026: Versioning Commit Message From Git Changelog

## Status
Accepted

## Date
2026-04-17

## Context
The Versioning tab Commit action opened the dialog with a static default message (`Update`).
This forced manual rewriting every time and did not leverage the available repository context already shown in the tab:
- changed files from `git status -sb`,
- recent commit log lines from the changelog section.

For an AI-assisted workflow, commit suggestions should be context-aware and style-consistent with the project history.

## Decision
Introduce a dedicated commit-message generator and use it when opening the Versioning Commit dialog.

Implementation details:
- New helper: `src/lib/project-git-commit-message.ts`.
- It infers commit `type(scope)` from recent changelog lines when available.
- It summarizes current changes as `update N files across <areas>`.
- It falls back to `Update` when there are no changed files.
- `src/components/organisms/Tabs/ProjectGitTab.tsx` now pre-fills the commit input with this generated message.

## Consequences
### Positive
- Commit flow is faster with meaningful default text.
- Suggested commit style aligns with recent repository changelog conventions.
- Logic is testable and isolated from UI rendering.

### Trade-offs
- Message quality is heuristic and may not always match user intent.
- Users still need to review and edit before submitting.

## Validation
- Added tests in `src/lib/__tests__/project-git-commit-message.test.ts`.
- Updated `.cursor/testing/test-coverage-source-of-truth.md`.
