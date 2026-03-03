#!/usr/bin/env bash
# Initialize project metadata: prompt for name, description, tech stack; write .cursor/project/*.md
# Run from project root (where .cursor exists). Requires .cursor/ to already exist (e.g. from app Initialize).

set -e
CURSOR="${CURSOR:-.cursor}"
PROJECT_DIR="$CURSOR/project"

echo "=== Initialize project (metadata in $PROJECT_DIR) ==="
read -r -p "Project name: " name
read -r -p "Short description (one line): " desc
read -r -p "Tech stack summary (e.g. Next.js, PostgreSQL): " stack

mkdir -p "$PROJECT_DIR"

cat > "$PROJECT_DIR/PROJECT-INFO.md" << EOF
# Project info — $name

## Name

$name

## Description

$desc

## Tech stack summary

- **Stack:** $stack
- **Frontend:** (see $CURSOR/1. project/frontend.json)
- **Backend:** (see $CURSOR/1. project/backend.json)
- **Documentation:** $CURSOR/documentation/ and docs/

## Links

- Repo: (URL)
- Docs: (URL if any)
EOF

cat > "$PROJECT_DIR/TECH-STACK.md" << EOF
# Tech stack — $name

Specific versions and choices. See also $CURSOR/1. project/frontend.json and backend.json.

## Frontend

| Category   | Choice        | Version |
| ---------- | ------------- | ------- |
| Framework  | (e.g. Next.js) |        |
| Styling    | (e.g. Tailwind) |       |
| State      | (e.g. Zustand) |        |
| Components | (e.g. shadcn/ui) |      |

## Backend

| Category  | Choice      | Version |
| --------- | ----------- | ------- |
| Runtime   | (e.g. Node) |         |
| Framework | (e.g. Express) |      |
| Database  | (e.g. PostgreSQL) |    |
| Auth      | (e.g. JWT)  |         |

## Testing & tooling

| Category | Choice |
| -------- | ------ |
| Unit     | (e.g. Vitest) |
| E2E      | (e.g. Playwright) |
| Lint     | ESLint |
EOF

cat > "$PROJECT_DIR/ROADMAP.md" << EOF
# Roadmap — $name

High-level project roadmap. Link to $CURSOR/planner/ and $CURSOR/milestones/ for details.

## Phases

1. **Foundation** — Setup, tooling, auth, design tokens.
2. **Core** — Data model, API, main UI flows.
3. **Quality** — Tests, a11y, error handling.
4. **Production** — Docs, deploy, hardening.

## Milestones

See $CURSOR/milestones/ for milestone files and $CURSOR/planner/tickets.md for work items.
EOF

echo "Wrote $PROJECT_DIR/PROJECT-INFO.md, TECH-STACK.md, ROADMAP.md"
echo "Optional: run node script/data/generate-milestones.js and node script/data/create-tickets.js next."
