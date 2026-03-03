import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const RUNNER_CRON_LINE_MARKER = "run-cron-jobs.sh";

/**
 * POST /api/ai-bots/cron/install-runner
 * Deploy the AI bots cron runner to the server and add a crontab entry so jobs in jobs.db run on schedule.
 * Body: { sessionId, basePath?: string } — basePath defaults to /var/www/ai.
 * Writes script/ai-bots/run_cron_jobs.py and run-cron-jobs.sh to basePath/scripts/ and adds:
 *   * * * * * basePath/scripts/run-cron-jobs.sh
 */
export async function POST(request: Request) {
  try {
    const { sessionId, basePath = "/var/www/ai" } = (await request.json()) as {
      sessionId?: string;
      basePath?: string;
    };

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const safeBase = basePath.replace(/\\/g, "/").replace(/"/g, '\\"').trim() || "/var/www/ai";
    const scriptsDir = path.join(process.cwd(), "script", "ai-bots");
    const pyPath = path.join(scriptsDir, "run_cron_jobs.py");
    const shPath = path.join(scriptsDir, "run-cron-jobs.sh");

    if (!fs.existsSync(pyPath) || !fs.existsSync(shPath)) {
      return NextResponse.json(
        { error: "Runner scripts not found (script/ai-bots/run_cron_jobs.py, run-cron-jobs.sh)" },
        { status: 500 }
      );
    }

    const pyContent = fs.readFileSync(pyPath, "utf8");
    const shContent = fs.readFileSync(shPath, "utf8");
    const b64Py = Buffer.from(pyContent, "utf8").toString("base64");
    const b64Sh = Buffer.from(shContent, "utf8").toString("base64");

    await executeCommand(sessionId, `mkdir -p "${safeBase}/scripts"`);
    await executeCommand(
      sessionId,
      `echo "${b64Py}" | base64 -d > "${safeBase}/scripts/run_cron_jobs.py"`
    );
    await executeCommand(
      sessionId,
      `echo "${b64Sh}" | base64 -d > "${safeBase}/scripts/run-cron-jobs.sh"`
    );
    await executeCommand(sessionId, `chmod +x "${safeBase}/scripts/run-cron-jobs.sh"`);

    const { stdout: crontabCurrent } = await executeCommand(
      sessionId,
      "crontab -l 2>/dev/null || echo ''"
    );
    const existing = crontabCurrent.trim();
    const withoutRunner =
      existing
        .split("\n")
        .filter((line) => !line.includes(RUNNER_CRON_LINE_MARKER))
        .join("\n")
        .trim();
    const cronLine = `* * * * * ${safeBase}/scripts/run-cron-jobs.sh`;
    const newCrontab = withoutRunner ? `${withoutRunner}\n${cronLine}` : cronLine;
    const b64Crontab = Buffer.from(newCrontab, "utf8").toString("base64");
    await executeCommand(sessionId, `echo "${b64Crontab}" | base64 -d | crontab -`);

    return NextResponse.json({
      success: true,
      message: "Cron runner installed; jobs in jobs.db will run on schedule every minute.",
      scriptsPath: `${safeBase}/scripts`,
      cronLine,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to install cron runner";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
