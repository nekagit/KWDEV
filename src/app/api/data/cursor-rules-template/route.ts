/**
 * GET: Return Cursor rules to seed a project's .cursor/rules.
 * Reads only from data/rules (JSON files). No fallback to app .cursor/rules or built-in.
 */
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

/** Not copied as a Cursor rule; drives Initialize all checklist only. */
const MANIFEST_FILE = "initialize-all-manifest.json";

function findDataDir(): string {
  const cwd = process.cwd();
  const inCwd = path.join(cwd, "data");
  if (fs.existsSync(inCwd) && fs.statSync(inCwd).isDirectory()) return inCwd;
  const inParent = path.join(cwd, "..", "data");
  if (fs.existsSync(inParent) && fs.statSync(inParent).isDirectory()) return inParent;
  return cwd;
}

function walkRuleFiles(dir: string, prefix: string): { name: string; content: string }[] {
  const results: { name: string; content: string }[] = [];
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkRuleFiles(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name));
    } else if (entry.isFile()) {
      if (entry.name === MANIFEST_FILE) continue;
      const lower = entry.name.toLowerCase();
      if (!lower.endsWith(".json")) continue;
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const name = prefix ? `${prefix}/${entry.name}` : entry.name;
        results.push({ name, content });
      } catch {
        // skip unreadable
      }
    }
  }
  return results;
}

/** Category key for rules at root of data/rules. */
const GENERAL_CATEGORY = "general";

export type InitializeAllChecklistItem = {
  categorySlug: string;
  label: string;
  summary: string;
  files: string[];
};

export type InitializeAllManifest = {
  version: number;
  title: string;
  description?: string;
  checklist: InitializeAllChecklistItem[];
};

function readInitializeAllManifest(rulesDir: string): InitializeAllManifest | null {
  const manifestPath = path.join(rulesDir, MANIFEST_FILE);
  if (!fs.existsSync(manifestPath) || !fs.statSync(manifestPath).isFile()) return null;
  try {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    const checklist = o.checklist;
    if (!Array.isArray(checklist)) return null;
    const items: InitializeAllChecklistItem[] = [];
    for (const row of checklist) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const categorySlug = typeof r.categorySlug === "string" ? r.categorySlug : "";
      const label = typeof r.label === "string" ? r.label : "";
      const summary = typeof r.summary === "string" ? r.summary : "";
      const files = Array.isArray(r.files) ? r.files.filter((f): f is string => typeof f === "string") : [];
      if (!categorySlug || !label || files.length === 0) continue;
      items.push({ categorySlug, label, summary, files });
    }
    const version = typeof o.version === "number" ? o.version : 1;
    const title = typeof o.title === "string" ? o.title : "Essential Cursor rules";
    const description = typeof o.description === "string" ? o.description : undefined;
    return { version, title, description, checklist: items };
  } catch {
    return null;
  }
}

/** Group rules by category: first path segment, or "general" for root-level files. */
function groupRulesByCategory(rules: { name: string; content: string }[]): Record<string, { name: string; content: string }[]> {
  const byCategory: Record<string, { name: string; content: string }[]> = {};
  for (const rule of rules) {
    const segs = rule.name.split("/");
    const category = segs.length > 1 ? segs[0]! : GENERAL_CATEGORY;
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push(rule);
  }
  return byCategory;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category")?.toLowerCase().trim() || null;

    const dataDir = findDataDir();
    const rulesDir = path.join(dataDir, "rules");
    const rules = walkRuleFiles(rulesDir, "");
    const rulesByCategory = groupRulesByCategory(rules);
    const categories = Array.from(new Set(Object.keys(rulesByCategory))).sort((a, b) => (a === GENERAL_CATEGORY ? 1 : b === GENERAL_CATEGORY ? -1 : a.localeCompare(b)));
    const initializeAllManifest = readInitializeAllManifest(rulesDir);

    if (category) {
      const list = rulesByCategory[category] ?? [];
      return NextResponse.json({
        rules: list,
        rulesByCategory,
        categories,
        initializeAllManifest,
        source: list.length > 0 ? `data/rules/${category === GENERAL_CATEGORY ? "" : category}` : "none",
      });
    }

    return NextResponse.json({
      rules,
      rulesByCategory,
      categories,
      initializeAllManifest,
      source: rules.length > 0 ? "data/rules" : "none",
    });
  } catch (e) {
    console.error("cursor-rules-template GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load rules template" },
      { status: 500 }
    );
  }
}
