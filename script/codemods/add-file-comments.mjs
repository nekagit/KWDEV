#!/usr/bin/env node
/**
 * Add file-top JSDoc to component files that don't have one.
 * Run from repo root: node script/add-file-comments.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SKIP = new Set(["tailwind-molecules.ts", "organism-classes.ts", "shared-classes.ts"]);

function hasFileComment(content) {
  const first = content.slice(0, 400);
  if (first.startsWith("/**")) return true;
  const lines = first.split("\n");
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].trimStart().startsWith("/**")) return true;
  }
  return false;
}

function descriptionFromName(name) {
  const base = name.replace(/\.(tsx?|ts)$/, "");
  const spaced = base.replace(/([A-Z])/g, " $1").trim();
  return `${spaced} component.`;
}

function addComment(filePath) {
  const rel = path.relative(ROOT, filePath);
  const content = fs.readFileSync(filePath, "utf8");
  if (hasFileComment(content)) return;
  const name = path.basename(filePath);
  if (SKIP.has(name)) return;
  const desc = descriptionFromName(name);
  const comment = `/** ${desc} */\n`;
  let newContent;
  if (content.startsWith('"use client";')) {
    newContent = content.replace(/^("use client";)\n\n/, `$1\n\n${comment}`);
  } else if (content.startsWith('"use client"\n')) {
    newContent = content.replace(/^("use client")\n\n/, `$1\n\n${comment}`);
  } else {
    newContent = comment + content;
  }
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, "utf8");
    console.log("Added comment:", rel);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules") {
      walk(full);
    } else if (e.isFile() && /\.(tsx?|ts)$/.test(e.name)) {
      addComment(full);
    }
  }
}

const target = process.argv[2] || "src/components";
walk(path.join(ROOT, target));
