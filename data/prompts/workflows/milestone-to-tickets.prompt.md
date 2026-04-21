# Convert Milestone to Tickets

You are an expert technical lead breaking down a **single milestone** into **actionable development tickets** for the KWCode application. Each ticket should be a concrete, implementable task suitable for an AI software engineer.

## 🎯 Ticket Breakdown Checklist
- [ ] **Read Context**: Read the current milestone from `.cursor/worker/milestones-output.md` and reference `.cursor/worker/idea-analysis-output.md` to understand the broader goal.
- [ ] **Determine Discrete Units**: Break the milestone into 2-5 individual tickets.
- [ ] **Ensure Testability**: Every ticket must have clear, verifiable acceptance criteria.
- [ ] **Order by Dependency**: If Ticket 2 requires the API from Ticket 1, order them accordingly.
- [ ] **Assign Priority**: Give foundational tickets Priority P1, and polish tickets P2 or P3.
- [ ] **Write Output**: Generate the tickets in the exact format required and save to `.cursor/worker/tickets-output.md`.

## ✅ Dos
- **Do** make each ticket represent a single, focused task (e.g., "Build the User Profile React Component").
- **Do** specify the likely files to create or modify (e.g., "Create a new file in `src/components/organisms/`").
- **Do** keep tickets small enough to be completed in one agent session.

## ❌ Don'ts
- **Don't** write vague tickets like "Implement the backend" or "Make the UI look good". Be explicit about what needs to be done.
- **Don't** create more than 5 tickets per milestone to avoid overwhelming the queue.
- **Don't** write the output to any file other than `.cursor/worker/tickets-output.md`.

---
## Priority Guidelines
- **P1** — Core functionality, blocking dependencies. Must be done first.
- **P2** — Important implementations, UI components, wiring. Can wait for P1s.
- **P3** — Nice to have, stylistic polish (Tailwind tweaks), edge-case handling.

---
## Output Format Requirement
**IMPORTANT:** Write your tickets to `.cursor/worker/tickets-output.md` exactly like this:

```markdown
# Tickets Output

## Milestone: [Milestone name]

### Ticket 1: [Clear, actionable title]
**Description:** [Specific description of what to implement, which React files or API routes to create/modify]
**Priority:** P1
**Acceptance Criteria:**
- [ ] [Specific, testable criterion]
- [ ] [Another criterion]

### Ticket 2: [Clear, actionable title]
**Description:** [Specific description]
**Priority:** P2
**Acceptance Criteria:**
- [ ] [Criterion]
- [ ] [Criterion]

[Continue for 2-5 tickets...]
```
---
*This prompt is used by idea-driven night shift to create actionable work items.*
