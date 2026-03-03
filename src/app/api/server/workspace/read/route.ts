import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

const WORKSPACE_PATH = "$HOME/kwcode-server";

/** Required for static export (output: 'export'). */
export const dynamic = "force-static";

/**
 * GET /api/server/workspace/read?sessionId=...&file=...
 * Read a file from the workspace (file = relative path under ~/kwcode-server).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const file = searchParams.get("file");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }
    if (!file || file.trim() === "" || file.includes("..")) {
      return NextResponse.json({ error: "file (relative path) is required and must not contain .." }, { status: 400 });
    }

    const safeFile = file.trim().replace(/^\/+/, "");
    const fullPath = `${WORKSPACE_PATH}/${safeFile}`;

    const { stdout, stderr } = await executeCommand(
      sessionId,
      `cat "${fullPath}" 2>/dev/null || echo ''`
    );

    if (stderr && !stdout) {
      return NextResponse.json({ error: "File not found or not readable" }, { status: 404 });
    }

    return NextResponse.json({ content: stdout });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to read file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
