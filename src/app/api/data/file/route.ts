/** route component. */
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-static";

const ROOT = process.cwd();

/** Allow only paths under ROOT; no ".." or absolute outside ROOT. */
function resolveSafe(relativePath: string): string | null {
  const normalized = path.normalize(relativePath);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) return null;
  const resolved = path.resolve(ROOT, normalized);
  if (!resolved.startsWith(path.resolve(ROOT))) return null;
  return resolved;
}

export async function GET(request: Request) {
  if (process.env.TAURI_BUILD === "1") return NextResponse.json({ error: "Missing path" }, { status: 400 });
  const { searchParams } = new URL(request.url);
  const rawPath = searchParams.get("path");
  if (!rawPath || typeof rawPath !== "string") {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }
  const resolved = resolveSafe(rawPath.trim());
  if (!resolved) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  try {
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 404 });
    }
    const content = fs.readFileSync(resolved, "utf-8");
    return new NextResponse(content, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    console.error("API data/file error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read file" },
      { status: 500 }
    );
  }
}
