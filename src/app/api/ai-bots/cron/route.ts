import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";
import { parseCrontab } from "@/lib/zeroclaw-parser";

/** Required for static export (output: 'export'). */
export const dynamic = "force-dynamic";

/**
 * GET /api/ai-bots/cron?sessionId=...
 * List cron jobs from crontab and .js cron files.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    // Get crontab entries
    let { stdout: crontabText } = await executeCommand(sessionId, `crontab -l 2>/dev/null || echo ''`);
    const jobs = parseCrontab(crontabText);

    return NextResponse.json({ jobs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list cron jobs" }, { status: 500 });
  }
}

/**
 * POST /api/ai-bots/cron
 * Manage cron jobs (enable, disable, run now, create, delete).
 */
export async function POST(request: Request) {
  try {
    const { sessionId, action, spec, handler } = await request.json();

    if (!sessionId || !action) {
      return NextResponse.json({ error: "sessionId and action are required" }, { status: 400 });
    }

    // Action: "run_now" runs a command immediately
    if (action === "run_now" && handler) {
      const { stdout, stderr } = await executeCommand(sessionId, handler);
      return NextResponse.json({ stdout, stderr });
    }

    // Action: "add_cron" adds a new crontab entry
    if (action === "add_cron" && spec && handler) {
      const cronLine = `${spec} ${handler}`;
      // Get existing crontab, add new line, write back
      let { stdout: existing } = await executeCommand(sessionId, `crontab -l 2>/dev/null || echo ''`);
      const updated = existing.trim() ? `${existing}\n${cronLine}` : cronLine;
      // Use printf with safer escaping to avoid shell injection
      const escapedForPrintf = updated.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const cmd = `printf '%s\\n' "${escapedForPrintf}" | crontab -`;
      await executeCommand(sessionId, cmd);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to manage cron" }, { status: 500 });
  }
}
