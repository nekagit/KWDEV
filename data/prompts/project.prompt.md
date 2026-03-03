# Project Analysis & Context 

You are an expert AI architect tasked with reading the entire workspace and generating a central Project Information document (`project.prompt.md` target `PROJECT-INFO.md`). This document serves as the foundational "What is this?" for both human developers and future AI agents to understand the KWCode application.

## 🎯 Project Info Checklist
- [ ] **Scan Root Files**: Review `package.json`, `README.md`, `next.config.js`, `tsconfig.json`, and `.cursor/adr/` to glean the exact tech stack and tooling.
- [ ] **Understand the Domain**: Summarize the primary business logic or user purpose of the application.
- [ ] **Identify Key Workflows**: Note the primary scripts and workflows developers use (e.g., `npm run dev`, `npm run verify`).
- [ ] **Assess Folder Architecture**: Summarize what lives in `src/app/`, `src/components/`, `src/store/`, `src/lib/`, and the `.cursor/` directory.
- [ ] **Draft the Output**: Ensure the Markdown accurately reflects the current state of the application without hallucinations.

## ✅ Dos
- **Do** use exact versions of major dependencies if helpful (e.g., Next.js 14, React 18).
- **Do** mention the specific flavor of the UI stack (Tailwind CSS, Radix UI, Framer Motion) since that's critical to front-end work.
- **Do** emphasize the atomic design methodology if it's visible in `src/components/{atoms,molecules,organisms}`.

## ❌ Don'ts
- **Don't** write "The project seems to be..." Write authoritatively: "The project is..."
- **Don't** delve too deeply into the frontend/backend endpoints, just provide the 10,000-foot view. (There are dedicated frontend/backend analyzer prompts for that).

---
## Required Document Structure

Build the project document using this distinct structure:

```markdown
# Project Overview: KWCode

## Domain & Purpose
[A 3-5 sentence summary of what the KWCode application actually does, its primary users, and its core value proposition.]

## Core Technologies
- **Framework:** Next.js (App/Pages Router) / React
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** [e.g., Zustand, Context]
- **Tooling:** [e.g., ESLint, Jest, Playwright]

## Repository Architecture
- `src/app/`: Next.js Routing
- `src/components/`: Atomic UI components (atoms, molecules, organisms)
- `src/store/`: Global state management
- `src/lib/`: Shared utilities and constants
- `.cursor/`: AI agent instructions, workflows, and prompts

## Developer Workflow
- **Start Dev Server:** `npm run dev`
- **Verify (Lint/Test/Build):** `npm run verify`

## Core Architectural Decisions
[Brief bullet points referencing any major ADRs or strict conventions in the codebase, such as specifically using dark-mode tailored Zinc/Indigo Tailwind palettes].
```
Output the **complete** project content. The app overwrites the target file with your output.
