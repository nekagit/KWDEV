#!/usr/bin/env bash
# Create or update docs/ structure for Docusaurus (or static docs). Links to .cursor/documentation/.
# Run from project root. Usage: .cursor/scripts/setup-documentation.sh [--docusaurus]

set -e
CURSOR="${CURSOR:-.cursor}"
DOCS_DIR="docs"
CURSOR_DOCS="$CURSOR/documentation"
DOCO_MAIN="${DOCO_MAIN:-false}"

for arg in "$@"; do
  case "$arg" in
    --docusaurus) DOCO_MAIN="true" ;;
  esac
done

echo "=== Setup documentation ($DOCS_DIR, link to $CURSOR_DOCS) ==="
mkdir -p "$DOCS_DIR/getting-started" "$DOCS_DIR/architecture" "$DOCS_DIR/development" "$DOCS_DIR/api" "$DOCS_DIR/guides" "$DOCS_DIR/contributing"

write_doc() {
  local file="$1"
  local title="$2"
  local body="$3"
  echo "$body" > "$DOCS_DIR/$file"
  echo "Wrote $DOCS_DIR/$file"
}

write_doc "getting-started/installation.md" "Installation" "---
sidebar_position: 1
title: Installation
---

# Installation

See \`$CURSOR_DOCS/setup-guide.md\` for prerequisites and install steps.

\`\`\`bash
npm install
cp .env.example .env
\`\`\`
"

write_doc "getting-started/quick-start.md" "Quick start" "---
sidebar_position: 2
title: Quick start
---

# Quick start

1. Install (see Installation).
2. \`npm run dev\`
3. Open the app and follow \`$CURSOR_DOCS/setup-guide.md\`.
"

write_doc "getting-started/configuration.md" "Configuration" "---
sidebar_position: 3
title: Configuration
---

# Configuration

Environment variables and app config. See \`$CURSOR/1. project/TECH-STACK.md\` and \`$CURSOR/1. project/\`.
"

write_doc "architecture/overview.md" "Architecture overview" "---
title: Architecture overview
---

# Architecture overview

See \`$CURSOR_DOCS/architecture-overview.md\` and \`$CURSOR/1. project/architecture.md\`.
"

write_doc "development/setup.md" "Development setup" "---
title: Development setup
---

# Development setup

See \`$CURSOR_DOCS/setup-guide.md\` and \`$CURSOR_DOCS/development-guide.md\`.
"

write_doc "development/workflows.md" "Workflows" "---
title: Workflows
---

# Workflows

Tickets, agents, milestones. See \`$CURSOR_DOCS/development-guide.md\` and \`$CURSOR/worker/workflows/ticket-workflow.md\`.
"

write_doc "development/agents-guide.md" "Agents guide" "---
title: Agents guide
---

# Agents guide

Role definitions in \`$CURSOR/agents/\`. Use with the app's Run tab and per-ticket prompts.
"

write_doc "development/best-practices.md" "Best practices" "---
title: Best practices
---

# Best practices

See \`$CURSOR_DOCS/code-organization.md\`, \`development-workflows.md\`, \`testing-strategy.md\`.
"

write_doc "api/README.md" "API reference" "---
title: API reference
---

# API reference

See \`$CURSOR_DOCS/api-reference.md\` and \`$CURSOR/1. project/backend.json\` for endpoints.
"

write_doc "guides/creating-features.md" "Creating features" "---
title: Creating features
---

# Creating features

Use \`$CURSOR/planner/ticket-templates/feature-ticket.template.md\` and \`$CURSOR/milestones/\`.
"

write_doc "guides/testing.md" "Testing" "---
title: Testing
---

# Testing

See \`$CURSOR_DOCS/testing-strategy.md\` and \`$CURSOR/1. project/testing.md\`.
"

write_doc "guides/deployment.md" "Deployment" "---
title: Deployment
---

# Deployment

See \`$CURSOR_DOCS/setup-guide.md\` and production checklist in \`$CURSOR/milestones/\`.
"

write_doc "contributing/code-style.md" "Code style" "---
title: Code style
---

# Code style

See \`$CURSOR_DOCS/code-organization.md\` and \`development-workflows.md\`.
"

write_doc "contributing/pr-process.md" "PR process" "---
title: PR process
---

# PR process

See \`$CURSOR_DOCS/development-workflows.md\`.
"

write_doc "contributing/ticket-workflow.md" "Ticket workflow" "---
title: Ticket workflow
---

# Ticket workflow

See \`$CURSOR/worker/workflows/ticket-workflow.md\`.
"

echo "Documentation structure created under $DOCS_DIR. For full Docusaurus, run: npx create-docusaurus@latest . classic --typescript (then move these into the generated docs)."
