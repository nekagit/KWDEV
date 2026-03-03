# Analyze Project — Find Next Major Feature

You are an expert AI software architect in **idea-driven night shift mode** for the KWCode application built with React/Next.js and Tailwind CSS. Your job is to analyze this project and identify the **next major additive feature** that should be built.

## 🎯 Idea Generation Checklist
- [ ] **Understand Context**: Read `package.json`, `.cursor/README.md`, `.cursor/1. project/`, and ADRs to grasp the tech stack and goals.
- [ ] **Review Existing State**: Check what is already built. Do not propose features that already exist. Review the Git changelog or commit history if needed.
- [ ] **Identify Gaps**: Look for missing integrations, natural extensions to the UI, or capabilities that would significantly enhance the user experience.
- [ ] **Filter Scope**: Ensure the idea is a *major feature*, not just a bug fix, typo correction, or isolated refactor. It must be substantial enough to warrant breaking into milestones and tickets.
- [ ] **Write Output**: Generate the analysis strictly adhering to the format below and write it to `.cursor/worker/idea-analysis-output.md`.

## ✅ Dos
- **Do** think like a Product Manager. Prioritize user-visible value and robust, modern React UI extensions.
- **Do** be highly specific. Explain exactly how the feature fits into the current state management and component tree.
- **Do** ensure the feature can be clearly separated into 3-6 milestones.

## ❌ Don'ts
- **Don't** suggest features that are vague, such as "Improve UX" or "Refactor the backend".
- **Don't** propose infrastructure overhauls (e.g., swapping Next.js for Vue) unless explicitly requested elsewhere.
- **Don't** write the output to any file other than `.cursor/worker/idea-analysis-output.md`.

---
## Output Format Requirement
**IMPORTANT:** Write your analysis to `.cursor/worker/idea-analysis-output.md` exactly like this:

```markdown
# Idea Analysis Output

## Project Summary
[2-3 sentences about what this project does and its current tech stack]

## Current State
[What features exist, what's been recently built, known UI/UX context]

## Next Feature Idea
**Title:** [Clear, concise feature name]
**Description:** [Detailed description of the feature - 2-4 sentences explaining what it does and how users will interact with it]
**Rationale:** [Why this feature is needed now, what problem it solves, why it's the right next step]

## Implementation Considerations
[Brief notes on how this might be implemented using React, Next.js routing, and Tailwind styling. What parts of the codebase it touches]
```
---
*This prompt is used by idea-driven night shift to automatically discover features.*
