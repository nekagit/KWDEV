import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const CRON_PROMPTS_DIR = "$HOME/kwcode-server/cron-prompts";

/**
 * GET /api/server/cron?sessionId=...
 * Fetch user crontab and system cron (/etc/crontab, /etc/cron.d/) so jobs like
 * scrape-news-daily in /etc/cron.d/ are visible in the Cron tab.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const parts: string[] = [];
    const run = async (label: string, command: string) => {
      const { stdout, stderr } = await executeCommand(sessionId, command);
      const out = (stdout + (stderr ? "\n" + stderr : "")).trim();
      parts.push(`${label}\n${out || "(none)"}`);
    };
    await run("=== User crontab (crontab -l) ===", "crontab -l 2>/dev/null || true");
    await run("=== System: /etc/crontab ===", "cat /etc/crontab 2>/dev/null || true");
    await run(
      "=== System: /etc/cron.d/ ===",
      "for f in /etc/cron.d/*; do [ -f \"$f\" ] && echo \"--- $f ---\" && cat \"$f\" && echo \"\"; done 2>/dev/null"
    );
    const text = parts.join("\n\n").trim()
      || "# No cron data. User: crontab -e. System: install files in /etc/cron.d/ (e.g. scrape-news-daily).";

    return NextResponse.json({ output: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch crontab";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function escapeForSingleQuotes(s: string): string {
  return s.replace(/'/g, "'\"'\"'");
}

/**
 * POST /api/server/cron
 * Add a cron job. Body: { sessionId, schedule, type: "agent" | "command", prompt?: string, command?: string }
 * - type "agent": prompt is written to ~/kwcode-server/cron-prompts/<id>.prompt.txt, cron line runs Cursor CLI with that file.
 * - type "command": raw command line (single line, no newlines).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, schedule, type, prompt, command } = body as {
      sessionId?: string;
      schedule?: string;
      type?: "agent" | "command";
      prompt?: string;
      command?: string;
    };

    if (!sessionId || !schedule || !type) {
      return NextResponse.json(
        { error: "sessionId, schedule, and type (agent | command) are required" },
        { status: 400 }
      );
    }

    const sched = schedule.trim();
    if (!/^[@*0-9,\-\/\s]+$/.test(sched) && !sched.startsWith("@")) {
      return NextResponse.json({ error: "Invalid cron schedule" }, { status: 400 });
    }

    let cronLine: string;

    if (type === "agent") {
      const promptText = typeof prompt === "string" ? prompt.trim() : "";
      if (!promptText) {
        return NextResponse.json({ error: "prompt is required for type agent" }, { status: 400 });
      }
      const id = crypto.randomUUID().slice(0, 8);
      const promptPath = `${CRON_PROMPTS_DIR}/${id}.prompt.txt`;
      const escaped = escapeForSingleQuotes(promptText);
      await executeCommand(
        sessionId,
        `mkdir -p ${CRON_PROMPTS_DIR} && echo '${escaped}' > ${promptPath}`
      );
      // Prepend PATH so cron (minimal env) finds Cursor CLI in ~/.local/bin or /usr/local/bin
      const runAgent = `export PATH="$HOME/.local/bin:/usr/local/bin:$PATH" && (command -v cursor >/dev/null 2>&1 && cursor --trust -p "\$(cat ${promptPath})" || (command -v agent >/dev/null 2>&1 && agent --trust -p "\$(cat ${promptPath})" || cursor-agent --trust -p "\$(cat ${promptPath})"))`;
      cronLine = `${sched} cd ${CRON_PROMPTS_DIR}/.. && /bin/bash -c '${runAgent}'`;
    } else {
      const cmd = typeof command === "string" ? command.trim() : "";
      if (!cmd || /\n|\r/.test(cmd)) {
        return NextResponse.json({ error: "command is required (single line) for type command" }, { status: 400 });
      }
      const escaped = escapeForSingleQuotes(cmd);
      cronLine = `${sched} /bin/bash -l -c '${escaped}'`;
    }

    const { stdout: current } = await executeCommand(sessionId, "crontab -l 2>/dev/null || echo ''");
    const existing = current.trim();
    const newCrontab = existing ? `${existing}\n${cronLine}` : cronLine;
    const b64 = Buffer.from(newCrontab, "utf8").toString("base64");
    await executeCommand(sessionId, `echo "${b64}" | base64 -d | crontab -`);

    return NextResponse.json({ success: true, line: cronLine });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add cron job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
