#!/usr/bin/env node
/**
 * Extracts Tailwind className strings from TSX under src (components, app, context)
 * and merges them into shared-classes.json (_catalog and _common). Keeps existing
 * shared component keys (Accordion, Card, etc.) intact.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..");
const srcRoot = path.join(repoRoot, "src");
const sharedPath = path.join(srcRoot, "components", "shared", "shared-classes.json");

function* walkTsx(dir, base = dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(base, full);
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && !e.name.startsWith(".")) {
        yield* walkTsx(full, base);
      }
    } else if (e.name.endsWith(".tsx")) {
      yield { full, rel: rel.replace(/\\/g, "/") };
    }
  }
}

// Match className="...", className='...', and className={`...`} (static part only; skip ${})
const RE_DOUBLE = /className\s*=\s*["']([^"']*)["']/g;
const RE_BACKTICK = /className\s*=\s*\{`((?:[^`\\]|\\.)*)`\}/g;
// cn("...", ...) or cn('...') - first string argument
const RE_CN = /cn\s*\(\s*["']([^"']*)["']/g;
// cva("base", { variants: { ... } }) - base string and variant values (quoted strings)
const RE_CVA_BASE = /cva\s*\(\s*["']([^"']*)["']/g;
const RE_CVA_VARIANT_STRING = /(?:variant|size|[\w]+):\s*\{[^}]*?["']([^"']+)["']/g;

function extractFromContent(content) {
  const out = [];
  let m;
  const seen = new Set();
  for (const re of [RE_DOUBLE, RE_CN]) {
    re.lastIndex = 0;
    while ((m = re.exec(content)) !== null) {
      const s = m[1].trim();
      if (s && !seen.has(s)) {
        seen.add(s);
        out.push(s);
      }
    }
  }
  // Backtick: take full template; if it contains ${ we still keep it for reference (user can split)
  RE_BACKTICK.lastIndex = 0;
  while ((m = RE_BACKTICK.exec(content)) !== null) {
    const s = m[1].trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  // cva base and variant class strings
  RE_CVA_BASE.lastIndex = 0;
  while ((m = RE_CVA_BASE.exec(content)) !== null) {
    const s = m[1].trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  RE_CVA_VARIANT_STRING.lastIndex = 0;
  while ((m = RE_CVA_VARIANT_STRING.exec(content)) !== null) {
    const s = m[1].trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

const byFile = {};
const allStrings = [];

// Scan src/components, src/app, src/context
for (const rootDir of ["components", "app", "context"]) {
  const dir = path.join(srcRoot, rootDir);
  for (const { full, rel } of walkTsx(dir, srcRoot)) {
    const content = fs.readFileSync(full, "utf8");
    const classes = extractFromContent(content);
    if (classes.length) {
      byFile[rel] = classes;
      allStrings.push(...classes);
    }
  }
}

// Repeated patterns (exact match) for "common" section
const count = {};
for (const s of allStrings) {
  count[s] = (count[s] || 0) + 1;
}
const common = Object.entries(count)
  .filter(([, n]) => n >= 2)
  .sort((a, b) => b[1] - a[1])
  .reduce((acc, [cls, n]) => {
    acc[cls] = { usageCount: n };
    return acc;
  }, {});

// Convert byFile to _catalog (path -> { "0": s0, "1": s1, ... })
const _catalog = {};
for (const [filePath, classes] of Object.entries(byFile)) {
  const obj = {};
  classes.forEach((c, i) => {
    obj[String(i)] = c;
  });
  _catalog[filePath] = obj;
}

// Read existing shared-classes.json to keep shared component keys
let existing = {};
try {
  existing = JSON.parse(fs.readFileSync(sharedPath, "utf8"));
} catch (_) {
  // no existing file
}
const { _meta: _oldMeta, _catalog: _oldCatalog, _common: _oldCommon, ...sharedKeys } = existing;

const _meta = {
  description:
    "Central Tailwind CSS class names. Top-level keys (Accordion, Card, etc.) are used by shared components. _catalog = classes extracted from the codebase (path -> slot index -> class string). _common = repeated patterns. Edit this file to improve styles centrally.",
  sharedKeys: Object.keys(sharedKeys).length,
  catalogPaths: Object.keys(_catalog).length,
  commonCount: Object.keys(common).length,
  generated: new Date().toISOString(),
  script: "script/tailwind/extract-tailwind-classes.mjs",
};

const output = {
  _meta,
  ...sharedKeys,
  _catalog,
  _common: common,
};

fs.writeFileSync(sharedPath, JSON.stringify(output, null, 2), "utf8");
console.log("Merged into shared-classes.json:", Object.keys(sharedKeys).length, "shared keys,", Object.keys(_catalog).length, "catalog paths,", Object.keys(common).length, "common patterns.");
