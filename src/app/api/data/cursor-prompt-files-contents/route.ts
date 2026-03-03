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

export type CursorPromptFileWithContent = {
  relativePath: string;
  path: string;
  name: string;
  content: string;
  updatedAt: string;
};

const DATA_PROMPTS_PREFIX = "data/prompts";

function walkAndReadPromptMdFiles(dir: string, prefix: string): CursorPromptFileWithContent[] {
  const results: CursorPromptFileWithContent[] = [];
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      results.push(...walkAndReadPromptMdFiles(fullPath, relativePath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".prompt.md")) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const stat = fs.statSync(fullPath);
        const pathFromRoot = prefix ? `${DATA_PROMPTS_PREFIX}/${relativePath}` : `${DATA_PROMPTS_PREFIX}/${entry.name}`;
        results.push({
          relativePath: prefix ? relativePath : entry.name,
          path: pathFromRoot,
          name: entry.name,
          content,
          updatedAt: stat.mtime.toISOString(),
        });
      } catch {
        // skip unreadable files
      }
    }
  }
  return results;
}

/**
 * GET: List all *.prompt.md files under data/prompts with their content.
 * Used for exporting all prompts as JSON or Markdown.
 * Path is /api/data/cursor-prompt-files-contents to avoid static-export conflict with cursor-prompt-files/contents.
 */
export async function GET() {
  try {
    const files = walkAndReadPromptMdFiles(PROMPTS_DIR, "").sort((a, b) =>
      a.path.localeCompare(b.path)
    );
    return NextResponse.json({ files });
  } catch (e) {
    console.error("cursor-prompt-files-contents GET error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read data/prompts prompt files" },
      { status: 500 }
    );
  }
}
