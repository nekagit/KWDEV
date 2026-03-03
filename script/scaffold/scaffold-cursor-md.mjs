#!/usr/bin/env node
/**
 * Scaffolds minimal .cursor/planner/tickets.md and .cursor/planner/features.md in the current
 * directory (or the path passed as first arg). Use once per repo so you can
 * then edit in the Kanban or in Cursor. Format matches .cursor/kanban-md-format.md.
 */
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const root = process.argv[2] ? join(process.cwd(), process.argv[2]) : process.cwd();
const cursorDir = join(root, ".cursor");
const plannerDir = join(root, ".cursor", "planner");

const projectName = "project";

const ticketsMd = `# Work items (tickets) — ${projectName}

**Project:** ${projectName}
**Source:** Scaffolded
**Last updated:** ${new Date().toISOString().slice(0, 10)}

---

## Summary: Done vs missing

### Done

| Area | What's implemented |

### Missing or incomplete

| Area | Gap |

---

## Prioritized work items (tickets)

### P0 — Critical / foundation

#### Feature: Getting started

- [ ] #1 Add first ticket — Edit this in the Kanban or here

### P1 — High / quality and maintainability

### P2 — Medium / polish and scale

### P3 — Lower / later

## Next steps

1. Add tickets under features in the Kanban or in this file.
`;

const featuresMd = `# Features roadmap

Features below are derived from \`.cursor/planner/tickets.md\`. Each major feature groups one or more work items (tickets); ticket numbers are listed so the Kanban and project details page parse and stay in sync.

## Major features

- [ ] Getting started — #1
`;

if (!existsSync(plannerDir)) {
  mkdirSync(plannerDir, { recursive: true });
}
writeFileSync(join(plannerDir, "tickets.md"), ticketsMd, "utf-8");
writeFileSync(join(plannerDir, "features.md"), featuresMd, "utf-8");
console.log("Created .cursor/planner/tickets.md and .cursor/planner/features.md in", root);
