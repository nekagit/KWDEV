/** route component. */
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { IDEAS_DOC_PATH } from "@/lib/cursor-paths";

export const dynamic = "force-static";

const IDEAS_MD_RELATIVE = IDEAS_DOC_PATH;

/**
 * GET: Read ideas.md from the workspace root (process.cwd()).
 * Used by the Ideas page to show doc content in an accordion and convert entries to DB ideas.
 */
export async function GET() {
  try {
    const cwd = process.cwd();
    const filePath = path.join(cwd, IDEAS_MD_RELATIVE);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return NextResponse.json({ content: null }, { status: 200 });
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return NextResponse.json({ content });
  } catch (e) {
    console.error("Ideas doc read error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read ideas.md" },
      { status: 500 }
    );
  }
}
