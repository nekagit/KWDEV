import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

function escapeShellPath(p: string): string {
  return p.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/`/g, "\\`");
}

const DEFAULT_LOG_PATHS = ["bot.log", "logs/combined.log", "logs/app.log", "log/out.log"];

/** Required for static export (output: 'export'). */
export const dynamic = "force-dynamic";

/**
 * GET /api/ai-bots/logs?sessionId=...&logPath=...&lines=100
 * Or: sessionId=...&botPath=...&lines=100 to try multiple paths under botPath.
 * Fetch recent log file lines.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const logPath = searchParams.get("logPath");
    const botPath = searchParams.get("botPath");
    const lines = Math.min(Math.max(parseInt(searchParams.get("lines") || "100", 10), 1), 5000);

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    let pathToTail: string | null = logPath || null;

    if (!pathToTail && botPath) {
      const safePath = escapeShellPath(botPath);
      const tryPaths = DEFAULT_LOG_PATHS.map((p) => `"${safePath}/${p}"`).join(" ");
      const cmd = `for f in ${tryPaths}; do if [ -r "$f" ]; then tail -n ${lines} "$f"; exit 0; fi; done; echo ''`;
      const { stdout } = await executeCommand(sessionId, cmd);
      const logLines = stdout.split("\n").filter(Boolean);
      return NextResponse.json({ lines: logLines });
    }

    if (!pathToTail) {
      return NextResponse.json({ error: "logPath or botPath is required" }, { status: 400 });
    }

    const safeLogPath = escapeShellPath(pathToTail);
    const { stdout } = await executeCommand(sessionId, `tail -n ${lines} "${safeLogPath}" 2>/dev/null || echo ''`);
    const logLines = stdout.split("\n").filter(Boolean);
    return NextResponse.json({ lines: logLines });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
