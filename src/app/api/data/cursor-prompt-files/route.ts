/** route component. */
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-static";

function findDataDir(): string {
  const cwd = process.cwd();
  const inCwd = path.join(cwd, "data");
  if (fs.existsSync(inCwd) && fs.statSync(inCwd).isDirectory()) return inCwd;
  const inParent = path.join(cwd, "..", "data");
  if (fs.existsSync(inParent) && fs.statSync(inParent).isDirectory()) return inParent;
  return inCwd;
}

const PROMPTS_DIR = path.join(findDataDir(), "prompts");

export type CursorPromptFileEntry = {
  /** Relative path from data/prompts (e.g. "design.prompt.md" or "sub/design.prompt.md") */
  relativePath: string;
  /** Path under root (e.g. "data/prompts/design.prompt.md") */
  path: string;
  /** File name (e.g. "design.prompt.md") */
  name: string;
  /** Size in bytes */
  size: number;
  /** ISO date string of mtime */
  updatedAt: string;
};

const DATA_PROMPTS_PREFIX = "data/prompts";

function walkPromptMdFiles(dir: string, prefix: string): CursorPromptFileEntry[] {
  const results: CursorPromptFileEntry[] = [];
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      results.push(...walkPromptMdFiles(fullPath, relativePath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".prompt.md")) {
      const stat = fs.statSync(fullPath);
      const pathFromRoot = prefix ? `${DATA_PROMPTS_PREFIX}/${relativePath}` : `${DATA_PROMPTS_PREFIX}/${entry.name}`;
      results.push({
        relativePath: prefix ? relativePath : entry.name,
        path: pathFromRoot,
        name: entry.name,
        size: stat.size,
        updatedAt: stat.mtime.toISOString(),
      });
    }
  }
  return results;
}

/**
 * GET: List all *.prompt.md files under data/prompts.
 * Used by the Prompts page ".cursor prompts" tab to keep the table in sync with the repo.
 */
export async function GET() {
  try {
    const files = walkPromptMdFiles(PROMPTS_DIR, "").sort((a, b) =>
      a.path.localeCompare(b.path)
    );
    return NextResponse.json({ files });
  } catch (e) {
    console.error("cursor-prompt-files GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list data/prompts prompt files" },
      { status: 500 }
    );
  }
}
