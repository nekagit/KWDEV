/**
 * GET: Return Cursor rules to seed a project's .cursor/rules.
 * Reads from process.cwd()/.cursor/rules if present; otherwise returns built-in useful rules.
 */
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

const RULES_DIR = ".cursor/rules";

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
      if (!lower.endsWith(".md") && !lower.endsWith(".mdc")) continue;
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

/** Built-in useful rules when app has no .cursor/rules. */
function getBuiltInRules(): { name: string; content: string }[] {
  return [
    {
      name: "typescript-exhaustive-switch.mdc",
      content: `---
description: Use exhaustive switch handling for TypeScript unions and enums
globs: "**/*.ts"
alwaysApply: false
---

Use exhaustive switch handling for TypeScript unions and enums. When switching on a union or enum, handle every variant or add a default that narrows to never (e.g. \`default: { const _: never = x; return _; }\`). Avoid falling through to a generic default without type safety.
`,
    },
    {
      name: "no-inline-imports.mdc",
      content: `---
description: Keep imports at top of file and avoid inline imports
globs: "**/*.{ts,tsx,js,jsx}"
alwaysApply: false
---

Keep imports at the top of the file. Do not use dynamic or inline imports (e.g. inside callbacks or conditionally) unless required for code-splitting or runtime loading. Prefer static imports for clarity and tooling.
`,
    },
    {
      name: "code-style.mdc",
      content: `---
description: General code style and clarity
alwaysApply: true
---

Prefer clarity over cleverness. Use consistent naming (camelCase for variables/functions, PascalCase for types/components). Keep functions small and focused. Avoid deep nesting; early returns are preferred. Comment why, not what.
`,
    },
  ];
}

export async function GET() {
  try {
    const cwd = process.cwd();
    const appRulesDir = path.join(cwd, RULES_DIR);
    const fromDisk = walkRuleFiles(appRulesDir, "");

    if (fromDisk.length > 0) {
      return NextResponse.json({
        rules: fromDisk,
        source: "app",
      });
    }

    return NextResponse.json({
      rules: getBuiltInRules(),
      source: "built-in",
    });
  } catch (e) {
    console.error("cursor-rules-template GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load rules template" },
      { status: 500 }
    );
  }
}
