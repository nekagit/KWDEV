/** GET /api/version — returns app version for browser mode. */
import { NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";

/** Required for static export (output: 'export'). */
export const dynamic = "force-static";

/**
 * GET /api/version — returns app version for browser-mode (Configuration page, support).
 * In Tauri desktop mode the frontend uses the get_app_version command instead.
 */
export async function GET() {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const raw = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as { version?: string };
    const version = typeof pkg.version === "string" ? pkg.version : "0.0.0";
    return NextResponse.json({ version });
  } catch {
    return NextResponse.json({ version: "0.0.0" }, { status: 200 });
  }
}
