/** GET /api/health — returns { ok, version } for browser mode. */
import { NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";

/** Required for static export (output: 'export'). */
export const dynamic = "force-static";

/**
 * GET /api/health — returns { ok: true, version } for monitoring (browser mode).
 * In Tauri production there is no Next server; this is for dev/standalone browser use.
 */
export async function GET() {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const raw = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as { version?: string };
    const version = typeof pkg.version === "string" ? pkg.version : "0.0.0";
    return NextResponse.json({ ok: true, version });
  } catch {
    return NextResponse.json({ ok: true, version: "0.0.0" }, { status: 200 });
  }
}
