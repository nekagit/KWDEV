import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

interface FileEntry {
  name: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
}

/** Required for static export (output: 'export'). */
export const dynamic = "force-dynamic";

/**
 * GET /api/ai-bots/files?sessionId=...&path=...
 * List directory contents.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const path = searchParams.get("path") || "/root";

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    // Validate path to prevent directory traversal and shell injection
    if (path.includes("..") || path.includes(";") || path.includes("|") || path.includes("&") || path.includes("`") || path.includes("$")) {
      return NextResponse.json({ error: "Invalid path characters" }, { status: 400 });
    }

    // List directory with ls -la format
    const { stdout } = await executeCommand(sessionId, `ls -la "${path}" 2>/dev/null | tail -n +2 || echo ''`);

    const files: FileEntry[] = [];
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

      const name = nameStr.trim();
      if (name === "." || name === "..") continue;

      files.push({
        name,
        type: isDir ? "directory" : "file",
        size: parseInt(sizeStr, 10),
        modified: `${monthStr} ${dayStr} ${timeStr}`,
      });
    }

    return NextResponse.json({ path, files });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list directory" }, { status: 500 });
  }
}
