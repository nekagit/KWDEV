/**
 * GET: Return Cursor rules to seed a project's .cursor/rules.
 * Reads only from data/rules (JSON files). No fallback to app .cursor/rules or built-in.
 */
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

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

export async function GET() {
  try {
    const dataDir = findDataDir();
    const rulesDir = path.join(dataDir, "rules");
    const rules = walkRuleFiles(rulesDir, "");

    return NextResponse.json({
      rules,
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
