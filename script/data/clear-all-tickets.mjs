#!/usr/bin/env node
/**
 * Clear all plan_tickets and plan_kanban_state from data/app.db.
 * Uses same data-dir resolution as src/lib/db.ts (cwd/data, then cwd/../data, else cwd).
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

function getDataDir() {
  const cwd = process.cwd();
  const inCwd = path.join(cwd, "data");
  if (fs.existsSync(inCwd) && fs.statSync(inCwd).isDirectory()) return inCwd;
  const inParent = path.join(cwd, "..", "data");
  if (fs.existsSync(inParent) && fs.statSync(inParent).isDirectory()) return inParent;
  return cwd;
}

const dataDir = getDataDir();
const dbPath = path.join(dataDir, "app.db");

if (!fs.existsSync(dbPath)) {
  console.warn("No database at %s; nothing to clear.", dbPath);
  process.exit(0);
}

const db = new Database(dbPath);

const ticketsDeleted = db.prepare("DELETE FROM plan_tickets").run();
const kanbanDeleted = db.prepare("DELETE FROM plan_kanban_state").run();

db.close();

console.log(
  "Cleared: plan_tickets=%d, plan_kanban_state=%d",
  ticketsDeleted.changes,
  kanbanDeleted.changes
);
