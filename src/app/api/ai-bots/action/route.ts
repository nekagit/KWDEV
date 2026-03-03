import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

/** Escape path for safe use inside double-quoted shell string. */
function escapeShellPath(p: string): string {
  return p.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/`/g, "\\`");
}

/** Escape path for safe use inside single-quoted shell string (for pkill -f pattern). */
function escapeSingleQuoted(p: string): string {
  return p.replace(/'/g, "'\"'\"'");
}

/** Required for static export (output: 'export'). */
export const dynamic = "force-dynamic";

/**
 * POST /api/ai-bots/action
 * Execute bot actions: start, stop, restart. Uses botPath when provided.
 * For zeroclaw agents (path contains /agents/): start runs in a subshell that exits so only
 * one process (zeroclaw daemon) remains, avoiding a lingering parent ("2 agents").
 */
export async function POST(request: Request) {
  try {
    const { sessionId, action, name, botPath } = await request.json();

    if (!sessionId || !action || !name) {
      return NextResponse.json({ error: "sessionId, action, and name are required" }, { status: 400 });
    }

    const rawPath = typeof botPath === "string" && botPath.trim() ? botPath.trim() : null;
    const safePath = rawPath ? escapeShellPath(rawPath) : null;
    const safePathSq = rawPath ? escapeSingleQuoted(rawPath) : null;
    const cd = safePath ? `cd "${safePath}" && ` : "";

    const isZeroclawAgent =
      rawPath && (rawPath.includes("/agents/") || rawPath.includes("/agent/"));
    const zeroclawPattern = safePathSq ? `'${safePathSq}/zeroclaw'` : "";
    // Only use zeroclaw start/stop when run-zeroclaw.sh exists (basic has it; advanced/premium may not).
    const zeroclawStartStop =
      isZeroclawAgent &&
      zeroclawPattern &&
      safePath &&
      `[ -f "${safePath}/run-zeroclaw.sh" ]`;

    let cmd = "";
    switch (action) {
      case "start":
        if (zeroclawStartStop) {
          // Subshell exits so zeroclaw is reparented to init; skip if already running.
          cmd = `if ${zeroclawStartStop}; then if pgrep -f ${zeroclawPattern} >/dev/null 2>&1; then echo "Already running"; exit 0; fi; ( cd "${safePath}" && nohup ./run-zeroclaw.sh >> zeroclaw.log 2>&1 & ); exit 0; fi; ( ${cd}test -f ecosystem.config.js && pm2 start ecosystem.config.js) || (${cd}pm2 start .) || (${cd}npm start) || (pm2 start "${name}" 2>/dev/null)`;
        } else if (safePath) {
          cmd = `(${cd}test -f ecosystem.config.js && pm2 start ecosystem.config.js) || (${cd}pm2 start .) || (${cd}npm start) || (pm2 start "${name}" 2>/dev/null)`;
        } else {
          cmd = `pm2 start "${name}" 2>/dev/null || true`;
        }
        break;
      case "stop":
        if (zeroclawStartStop) {
          cmd = `if ${zeroclawStartStop}; then pkill -f ${zeroclawPattern} 2>/dev/null || true; exit 0; fi; (pm2 stop "${name}" 2>/dev/null); pkill -f "node.*${safePath}" 2>/dev/null; true`;
        } else if (safePath) {
          cmd = `(pm2 stop "${name}" 2>/dev/null); pkill -f "node.*${safePath}" 2>/dev/null; true`;
        } else {
          cmd = `pm2 stop "${name}" 2>/dev/null || pkill -f "node.*${name}" || true`;
        }
        break;
      case "restart":
        if (zeroclawStartStop) {
          cmd = `if ${zeroclawStartStop}; then pkill -f ${zeroclawPattern} 2>/dev/null || true; sleep 1; ( cd "${safePath}" && nohup ./run-zeroclaw.sh >> zeroclaw.log 2>&1 & ); exit 0; fi; (pm2 restart "${name}" 2>/dev/null) || (${cd}test -f ecosystem.config.js && pm2 start ecosystem.config.js) || (${cd}pm2 start .) || (${cd}npm start)`;
        } else if (safePath) {
          cmd = `(pm2 restart "${name}" 2>/dev/null) || (${cd}test -f ecosystem.config.js && pm2 start ecosystem.config.js) || (${cd}pm2 start .) || (${cd}npm start)`;
        } else {
          cmd = `pm2 restart "${name}" 2>/dev/null || true`;
        }
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const { stdout, stderr } = await executeCommand(sessionId, cmd);
    return NextResponse.json({ success: true, stdout, stderr });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to execute action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
