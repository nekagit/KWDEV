/** route component. */
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-static";

const ALLOWED_PREFIXES = [".cursor/", "data/prompts/", "data/agents/"];

/**
 * GET: Read a file from process.cwd() under .cursor/, data/prompts/, or data/agents/.
 * Query param: path = relative path (e.g. "data/prompts/workflows/implement-all.prompt.md", ".cursor/0. ideas/ideas.md").
 * Used as fallback when project repo read returns empty so tabs show content when project is the app repo.
 */
export async function GET(request: NextRequest) {
  if (process.env.TAURI_BUILD === "1") return NextResponse.json({ content: null }, { status: 200 });
  try {
    const { searchParams } = new URL(request.url);
    const relativeParam = searchParams.get("path");
    if (!relativeParam || typeof relativeParam !== "string") {
      return NextResponse.json({ content: null }, { status: 200 });
    }
    const trimmed = path.normalize(relativeParam.trim()).replace(/\\/g, "/");
    if (trimmed.startsWith("..") || trimmed.includes("..") || path.isAbsolute(trimmed)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const allowed = ALLOWED_PREFIXES.some((p) => trimmed === p || trimmed.startsWith(p));
    if (!allowed) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const cwd = process.cwd();
    const filePath = path.resolve(cwd, trimmed);
    const cwdResolved = path.resolve(cwd);
    if (!filePath.startsWith(cwdResolved)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return NextResponse.json({ content: null }, { status: 200 });
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return NextResponse.json({ content });
  } catch (e) {
    console.error("Cursor doc read error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read file" },
      { status: 500 }
    );
  }
}
