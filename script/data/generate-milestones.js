#!/usr/bin/env node
/**
 * Generate milestone markdown files under .cursor/milestones/ from a simple config or defaults.
 * Run from project root. Usage: node .cursor/scripts/generate-milestones.js [--dry-run]
 *
 * Reads .cursor/planner/project-plan.md if present to align phase names; otherwise uses defaults.
 */

const fs = require("fs");
const path = require("path");

const CURSOR = process.env.CURSOR || ".cursor";
const DRY_RUN = process.argv.includes("--dry-run");
const milestonesDir = path.join(process.cwd(), CURSOR, "milestones");

const defaultMilestones = [
  { file: "01-project-setup.milestone.md", title: "Project setup", objective: "Initialize repo, tooling, env, and base layout.", tickets: "#1–#12" },
  { file: "02-core-architecture.milestone.md", title: "Core architecture", objective: "Define system architecture, data model, and API surface.", tickets: "#13–#20" },
  { file: "03-mvp-features.milestone.md", title: "MVP features (core UI)", objective: "Implement primary user workflows: list/detail, forms, navigation.", tickets: "#21–#31" },
  { file: "04-testing-infrastructure.milestone.md", title: "Testing infrastructure", objective: "Unit tests, E2E tests, error handling, a11y.", tickets: "#32–#42" },
  { file: "05-documentation.milestone.md", title: "Documentation", objective: "README, deployment steps, production checklist.", tickets: "#43–#48" },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeMilestone(m) {
  const content = `# Milestone — ${m.title}

## Objective

${m.objective}

## Deliverables

- [ ] (Fill in)
- [ ] (Fill in)

## Success criteria

- (Fill in)

## Tickets

See \`${CURSOR}/planner/tickets.md\` — ${m.tickets}

## Required agents

frontend-dev, backend-dev (add tester, documentation-writer as needed)
`;
  const outPath = path.join(milestonesDir, m.file);
  if (DRY_RUN) {
    console.log("[dry-run] would write", outPath);
    return;
  }
  fs.writeFileSync(outPath, content, "utf8");
  console.log("Wrote", outPath);
}

function main() {
  ensureDir(milestonesDir);
  defaultMilestones.forEach(writeMilestone);
  console.log("Done. Edit .cursor/milestones/*.milestone.md to customize.");
}

main();
