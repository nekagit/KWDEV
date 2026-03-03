#!/usr/bin/env node
/**
 * Append suggested tickets to .cursor/planner/tickets.md or to .cursor/planner/ai-suggestions/generated-tickets.md.
 * Run from project root. Usage: node .cursor/scripts/create-tickets.js [--suggestions-only] [--priority P1]
 *
 * --suggestions-only: write to ai-suggestions/generated-tickets.md instead of tickets.md (for review first).
 * --priority: P0|P1|P2|P3 (default P1).
 *
 * Reads template from .cursor/planner/ticket-templates/feature-ticket.template.md or pass ticket title as first arg.
 * Example: node .cursor/scripts/create-tickets.js "Add login form" --priority P0
 */

const fs = require("fs");
const path = require("path");

const CURSOR = process.env.CURSOR || ".cursor";
const args = process.argv.slice(2);
const suggestionsOnly = args.includes("--suggestions-only");
const priorityIdx = args.indexOf("--priority");
const priority = priorityIdx >= 0 && args[priorityIdx + 1] ? args[priorityIdx + 1] : "P1";
const titleArg = args.filter((a) => !a.startsWith("--") && a !== priority)[0];

const ticketsPath = path.join(process.cwd(), CURSOR, "planner", "tickets.md");
const suggestionsPath = path.join(process.cwd(), CURSOR, "planner", "ai-suggestions", "generated-tickets.md");

function getNextTicketNumber(content) {
  const matches = content.match(/#(\d+)/g);
  if (!matches || matches.length === 0) return 1;
  const nums = matches.map((m) => parseInt(m.slice(1), 10));
  return Math.max(...nums) + 1;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  const title = titleArg || "New ticket (edit me)";
  const currentTickets = fs.existsSync(ticketsPath) ? fs.readFileSync(ticketsPath, "utf8") : "";
  const nextNum = getNextTicketNumber(currentTickets);
  const line = `- [ ] #${nextNum} ${title} — @frontend-dev @backend-dev`;

  if (suggestionsOnly) {
    ensureDir(path.dirname(suggestionsPath));
    const existing = fs.existsSync(suggestionsPath) ? fs.readFileSync(suggestionsPath, "utf8") : "";
    const suggestion = existing.includes("Current suggestions") 
      ? existing.replace(/(\n## Current suggestions\n)([\s\S]*)/, `$1\n${line}\n$2`) 
      : existing + "\n## Current suggestions\n\n" + line + "\n";
    fs.writeFileSync(suggestionsPath, suggestion.trim() + "\n", "utf8");
    console.log("Appended to", suggestionsPath);
    return;
  }

  const priorityLabel = { P0: "Critical / foundation", P1: "High / quality and maintainability", P2: "Medium / polish and scale", P3: "Lower / later" }[priority] || "High / quality and maintainability";
  const sectionHeader = `### ${priority} — ${priorityLabel}`;
  let content = currentTickets || `# Work items (tickets)

**Project:** (name)
**Source:** Kanban
**Last updated:** ${new Date().toISOString().slice(0, 10)}

---

## Prioritized work items (tickets)

### P1 — High / quality and maintainability

#### Feature: General

`;
  if (!content.includes(sectionHeader)) {
    content = content.trimEnd() + "\n\n" + sectionHeader + "\n\n#### Feature: General\n\n" + line + "\n";
  } else {
    const idx = content.lastIndexOf("#### Feature:");
    const lineEnd = content.indexOf("\n", content.indexOf("\n", idx) + 1);
    const insertAt = lineEnd > idx ? lineEnd + 1 : content.length;
    content = content.slice(0, insertAt) + line + "\n" + content.slice(insertAt);
  }
  fs.writeFileSync(ticketsPath, content, "utf8");
  console.log("Appended ticket #" + nextNum + " to", ticketsPath);
}

main();
