/** route component. */
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-static";

const TEMPLATE_DIR = ".cursor_template";

function readDirRecursive(dir: string, baseDir: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const relative = path.relative(baseDir, full);
    if (e.isDirectory()) {
      Object.assign(out, readDirRecursive(full, baseDir));
    } else if (e.isFile()) {
      try {
        out[relative] = fs.readFileSync(full, "utf-8");
      } catch {
        // skip unreadable files
      }
    }
  }
  return out;
}

/** GET: returns all files under the template dir as { files: { "agents/frontend-dev.md": "content...", ... } } for copying to project as .cursor/ */
export async function GET() {
  try {
    const cwd = process.cwd();
    const templateRoot = path.resolve(cwd, TEMPLATE_DIR);
    if (!fs.existsSync(templateRoot) || !fs.statSync(templateRoot).isDirectory()) {
      return NextResponse.json(
        { error: "Template folder not found" },
        { status: 404 }
      );
    }
    const files = readDirRecursive(templateRoot, templateRoot);
    return NextResponse.json({ files });
  } catch (e) {
    console.error("cursor-init-template read error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read template" },
      { status: 500 }
    );
  }
}
