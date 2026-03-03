import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

const WORKSPACE_PATH_DEFAULT = "$HOME/kwcode-server";

export interface WorkspaceFileEntry {
  name: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
}

export const dynamic = "force-dynamic";

/**
 * GET /api/server/workspace?sessionId=...&path=...
 * List contents of the server workspace folder (default ~/kwcode-server).
 * Uses $HOME so the path is expanded on the remote server.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const pathParam = searchParams.get("path") || WORKSPACE_PATH_DEFAULT;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    // Expand ~ to $HOME on remote so ls works
    const path = pathParam.startsWith("~") ? pathParam.replace(/^~/, "$HOME") : pathParam;
    const { stdout } = await executeCommand(
      sessionId,
      `ls -la "${path}" 2>/dev/null | tail -n +2 || echo ''`
    );

    const files: WorkspaceFileEntry[] = [];
    const lines = stdout.split("\n").filter(Boolean);

    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length < 9) continue;

      const isDir = parts[0].startsWith("d");
      const sizeStr = parts[4];
      const monthStr = parts[5];
      const dayStr = parts[6];
      const timeStr = parts[7];
      const nameStr = parts.slice(8).join(" ");

      files.push({
        name: nameStr,
        type: isDir ? "directory" : "file",
        size: parseInt(sizeStr, 10),
        modified: `${monthStr} ${dayStr} ${timeStr}`,
      });
    }

    const pathDisplay = pathParam === WORKSPACE_PATH_DEFAULT ? "~/kwcode-server" : pathParam;
    return NextResponse.json({ path: pathDisplay, files });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list workspace";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
