import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

export const dynamic = "force-dynamic";

const LINES_MIN = 20;
const LINES_MAX = 500;

/**
 * GET /api/server/logs?sessionId=...&type=syslog|auth|security|nginx|custom&lines=80&path=...
 * type=security (default): failed logins (lastb) + auth/syslog failure lines
 * type=syslog: tail /var/log/syslog
 * type=auth: tail /var/log/auth.log
 * type=nginx: tail nginx error + access (if readable)
 * type=custom: tail path (path required, must be under /var/log)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const type = (searchParams.get("type") || "security").toLowerCase();
    const path = searchParams.get("path")?.trim() || "";
    const lines = Math.min(LINES_MAX, Math.max(LINES_MIN, parseInt(searchParams.get("lines") || "80", 10)));

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    if (type === "custom" && (!path || !path.startsWith("/var/log/") || path.includes(".."))) {
      return NextResponse.json({ error: "path is required and must be under /var/log" }, { status: 400 });
    }

    const safeLines = String(lines);
    let script: string;

    switch (type) {
      case "syslog":
        script = `tail -n ${safeLines} /var/log/syslog 2>/dev/null || echo "(no access to /var/log/syslog)"`;
        break;
      case "auth":
        script = `tail -n ${safeLines} /var/log/auth.log 2>/dev/null || echo "(no access to /var/log/auth.log)"`;
        break;
      case "security": {
        script = `
( lastb 2>/dev/null | head -30 || echo "(no lastb data)" )
echo "---"
( grep -i "failed\\|invalid\\|error" /var/log/auth.log 2>/dev/null | tail -${safeLines} || grep -i "failed\\|invalid\\|error" /var/log/syslog 2>/dev/null | tail -${safeLines} || echo "(no auth/syslog access)" )
`;
        break;
      }
      case "nginx":
        script = `echo "=== nginx error.log ===" && tail -n ${safeLines} /var/log/nginx/error.log 2>/dev/null || echo "(no nginx error.log)"; echo ""; echo "=== nginx access.log ===" && tail -n ${Math.min(50, lines)} /var/log/nginx/access.log 2>/dev/null || echo "(no nginx access.log)"`;
        break;
      case "custom":
        script = `tail -n ${safeLines} "${path}" 2>/dev/null || echo "(no access to ${path})"`;
        break;
      default:
        return NextResponse.json({ error: "type must be syslog, auth, security, nginx, or custom" }, { status: 400 });
    }

    const { stdout, stderr } = await executeCommand(sessionId, script);
    const text = (stdout + (stderr ? "\n" + stderr : "")).trim() || "No log output (insufficient permissions or no entries).";

    return NextResponse.json({ output: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
