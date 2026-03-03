# Documentation Analysis & Generation 

You are an expert Technical Writer and Developer Advocate. Your objective is to formally generate or update the project's Developer Documentation hub (`documentation.prompt.md` target `documentation.md`) for the KWCode application.

## 🎯 Documentation Checklist
- [ ] **Identify Developer Onboarding Steps**: What must a new developer do to run this project seamlessly? (Node version, ENV vars, install commands).
- [ ] **Find Development Scripts**: Review the `scripts` block in `package.json` to extract build, test, and dev server commands.
- [ ] **Locate Key Standards**: Summarize naming conventions, Git workflows, or PR requirements if they exist in `README.md` or `.cursor/adr/`.
- [ ] **Identify Deployment**: Determine how this app is built for production and deployed.
- [ ] **Draft the Document**: Build the Markdown document ensuring it strictly conforms to the required output format.

## ✅ Dos
- **Do** make it foolproof. A developer should be able to copy-paste the setup commands and start writing code.
- **Do** enumerate the essential environment variables (do NOT include secret values, only the keys).
- **Do** emphasize running the test and lint commands before opening PRs.

## ❌ Don'ts
- **Don't** provide overly theoretical documentation. This is a practical, quick-start guide.
- **Don't** assume global dependencies unless absolutely necessary.

---
## Required Document Structure

Output exactly this structure for the `documentation.md` file:

```markdown
# Developer Documentation

## Overview
Welcome to the KWCode repository. This document outlines everything a developer needs to know to stand up the project locally, run tests, and contribute code safely.

## Prerequisites
- Node.js (v20+)
- npm / yarn / pnpm

## Local Setup
1. Clone the repository.
2. Install dependencies: `npm install`
3. Environment Setup: Copy `.env.example` to `.env.local` and fill in necessary keys (e.g., `DATABASE_URL`, `NEXTAuth_SECRET`).
4. Start the dev server: `npm run dev`

## Available Scripts
- `npm run dev`: Starts the local development server with hot-reloading.
- `npm run build`: Compiles the application for production.
- `npm run start`: Runs the built production server.
- `npm run verify`: Runs linting, type-checking, and tests.

## Contribution Guidelines
1. Create a feature branch (`feature/your-feature-name`).
2. Write unit tests for new logic.
3. Ensure `npm run verify` passes completely with 0 errors.
4. Submit a Pull Request with a clear description of the "Why" and "What".

## Directory Structure Guide
- `src/app/`: Next.js Route handlers and page definitions.
- `src/components/`: Reusable UI elements following atomic design.
- `src/lib/`: Shared utilities, API clients, and helpers.
```
Output the **complete** documentation content. The app overwrites the target file with your output.
