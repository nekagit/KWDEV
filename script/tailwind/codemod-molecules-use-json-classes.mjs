#!/usr/bin/env node
/**
 * Replaces inline Tailwind classNames in molecule files with references to tailwind-molecules.json.
 * Run from repo root. Uses same match order as extract-tailwind-molecules.mjs (RE_DOUBLE, RE_CN, RE_BACKTICK).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const moleculesDir = path.join(__dirname, "..", "src", "components", "molecules");
const jsonPath = path.join(moleculesDir, "tailwind-molecules.json");
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const byFile = data.byFile || {};

const RE_DOUBLE = /className\s*=\s*["']([^"']*)["']/g;
const RE_CN = /cn\s*\(\s*["']([^"']*)["']/g;
const RE_BACKTICK = /className\s*=\s*\{`((?:[^`\\]|\\.)*)`\}/g;

function findAllMatches(content) {
  const matches = [];
  let m;
  for (const re of [RE_DOUBLE, RE_CN]) {
    re.lastIndex = 0;
    while ((m = re.exec(content)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length, full: m[0], inner: m[1].trim() });
    }
  }
  RE_BACKTICK.lastIndex = 0;
  while ((m = RE_BACKTICK.exec(content)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, full: m[0], inner: m[1].trim() });
  }
  matches.sort((a, b) => a.start - b.start);
  return matches;
}

function applyReplacements(content, relativePath, classes) {
  const matches = findAllMatches(content);
  if (matches.length === 0) return content;
  if (matches.length > classes.length) {
    console.warn(`${relativePath}: more matches (${matches.length}) than class entries (${classes.length}), skipping`);
    return content;
  }
  let out = content;
  let shift = 0;
  for (let i = 0; i < matches.length; i++) {
    const idx = classes.indexOf(matches[i].inner);
    const useIndex = idx >= 0 ? idx : i;
    const replacement = matches[i].full.startsWith("cn")
      ? `cn(classes[${useIndex}]`
      : `className={classes[${useIndex}]}`;
    const start = matches[i].start + shift;
    const end = matches[i].end + shift;
    out = out.slice(0, start) + replacement + out.slice(end);
    shift += replacement.length - (matches[i].end - matches[i].start);
  }
  return out;
}

function ensureImportAndConst(content, relativePath) {
  const needle = "getClasses";
  if (content.includes(needle)) return content;
  const importLine = 'import { getClasses } from "@/components/molecules/tailwind-molecules";';
  const constLine = `const classes = getClasses("${relativePath.replace(/\\/g, "/")}");`;
  const insert = `\n${importLine}\n${constLine}\n`;

  const lines = content.split("\n");
  let insertAfter = 0;
  if (lines[0].startsWith('"use client"')) insertAfter = 1;
  for (let i = insertAfter; i < lines.length; i++) {
    if (/^\s*import\s/.test(lines[i])) insertAfter = i + 1;
    else if (lines[i].trim() !== "") break;
  }
  lines.splice(insertAfter, 0, importLine, constLine);
  return lines.join("\n");
}

let done = 0;
let skipped = 0;
for (const [relativePath, classes] of Object.entries(byFile)) {
  if (!Array.isArray(classes) || classes.length === 0) continue;
  const fullPath = path.join(moleculesDir, relativePath);
  if (!fs.existsSync(fullPath)) {
    skipped++;
    continue;
  }
  let content = fs.readFileSync(fullPath, "utf8");
  const matches = findAllMatches(content);
  if (matches.length === 0) {
    skipped++;
    continue;
  }
  content = applyReplacements(content, relativePath, classes);
  content = ensureImportAndConst(content, relativePath);
  fs.writeFileSync(fullPath, content, "utf8");
  done++;
}
console.log("Updated", done, "files, skipped", skipped);
