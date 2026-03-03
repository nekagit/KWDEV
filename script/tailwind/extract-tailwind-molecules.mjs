#!/usr/bin/env node
/**
 * Extracts Tailwind className strings from TSX under src/components/molecules only.
 * Writes tailwind-molecules.json in that folder.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..");
const moleculesDir = path.join(repoRoot, "src", "components", "molecules");
const outPath = path.join(moleculesDir, "tailwind-molecules.json");

function* walkTsx(dir, base = dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(base, full);
    if (e.isDirectory()) {
      if (!e.name.startsWith(".")) yield* walkTsx(full, base);
    } else if (e.name.endsWith(".tsx")) {
      yield { full, rel: rel.replace(/\\/g, "/") };
    }
  }
}

const RE_DOUBLE = /className\s*=\s*["']([^"']*)["']/g;
const RE_BACKTICK = /className\s*=\s*\{`((?:[^`\\]|\\.)*)`\}/g;
const RE_CN = /cn\s*\(\s*["']([^"']*)["']/g;

// Collect in source order (no dedupe) so codemod can replace 1:1 by index.
function extractFromContent(content) {
  const out = [];
  let m;
  for (const re of [RE_DOUBLE, RE_CN]) {
    re.lastIndex = 0;
    while ((m = re.exec(content)) !== null) {
      const s = m[1].trim();
      if (s) out.push(s);
    }
  }
  RE_BACKTICK.lastIndex = 0;
  while ((m = RE_BACKTICK.exec(content)) !== null) {
    const s = m[1].trim();
    if (s) out.push(s);
  }
  return out;
}

const byFile = {};
const allStrings = [];

for (const { full, rel } of walkTsx(moleculesDir)) {
  const content = fs.readFileSync(full, "utf8");
  const classes = extractFromContent(content);
  if (classes.length) {
    byFile[rel] = classes;
    allStrings.push(...classes);
  }
}

const count = {};
for (const s of allStrings) count[s] = (count[s] || 0) + 1;
const common = Object.entries(count)
  .filter(([, n]) => n >= 2)
  .sort((a, b) => b[1] - a[1])
  .reduce((acc, [cls, n]) => {
    acc[cls] = { usageCount: n };
    return acc;
  }, {});

const output = {
  _meta: {
    generated: new Date().toISOString(),
    note: "Tailwind classes extracted from src/components/molecules only. Edit to improve styles; re-run npm run extract:tailwind-molecules to refresh.",
  },
  common,
  byFile,
};

fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
console.log("Wrote", outPath, "| Files:", Object.keys(byFile).length, "| Common:", Object.keys(common).length);
