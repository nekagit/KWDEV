import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

interface JobRecord {
  id?: number | string;
  name: string;
  schedule: string; // cron expression
  handler: string;
  enabled: boolean | number;
  last_run?: string;
  run_count?: number;
  error_count?: number;
}

/** Required for static export (output: 'export'). */
export const dynamic = "force-dynamic";

/** True only when handler clearly looks like a shell command; otherwise treat as natural-language prompt for Cursor CLI. */
function isShellCommand(handler: string): boolean {
  const t = handler.trim();
  if (!t) return false;
  if (t.startsWith("/")) return true;
  if (t.includes(".sh") || t.endsWith(".sh")) return true;
  const first = (t.split(/\s+/)[0] ?? "").toLowerCase();
  if (first.includes("/")) return true;
  const knownBinaries = ["curl", "node", "python", "python3", "npm", "npx", "bash", "sh", "env", "wget", "cat", "echo"];
  if (knownBinaries.includes(first)) return true;
  return false;
}

/**
 * GET /api/ai-bots/jobs?sessionId=...&botPath=...
 * Read jobs from jobs.db (SQLite). Supports both "jobs" and "cron_jobs" table schemas.
 * Uses Python for portability when sqlite3 CLI is not installed on the server.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const botPath = searchParams.get("botPath");

    if (!sessionId || !botPath) {
      return NextResponse.json(
        { error: "sessionId and botPath are required" },
        { status: 400 }
      );
    }

    const dbPath = `${botPath}/cron/jobs.db`;

    // If cron/jobs.db does not exist, return empty list (no 500)
    const { stdout: existsOut } = await executeCommand(
      sessionId,
      `test -f "${dbPath}" && echo "yes" || echo ""`
    );
    if (existsOut.trim() !== "yes") {
      return NextResponse.json({ jobs: [] });
    }

    // Use Python to query (works when sqlite3 CLI is not installed). Try "jobs" then "cron_jobs".
    const safePath = dbPath.replace(/'/g, "'\"'\"'");
    const cmd = `python3 -c '
import sqlite3, json, sys
path = sys.argv[1]
try:
  conn = sqlite3.connect(path)
  conn.row_factory = sqlite3.Row
  cur = conn.cursor()
  try:
    cur.execute("SELECT * FROM jobs ORDER BY id")
    rows = [dict(r) for r in cur.fetchall()]
    if rows:
      print(json.dumps(rows))
      sys.exit(0)
  except sqlite3.OperationalError:
    pass
  cur.execute("SELECT id, name, expression, command, prompt, enabled, last_run FROM cron_jobs ORDER BY created_at")
  rows = cur.fetchall()
  out = []
  for r in rows:
    schedule = r["expression"] or ""
    handler = r["command"] or r["prompt"] or ""
    name = r["name"] or schedule or "Job"
    out.append({"id": r["id"], "name": name, "schedule": schedule, "handler": handler, "enabled": r["enabled"], "last_run": r["last_run"] or None, "run_count": 0, "error_count": 0})
  print(json.dumps(out))
  conn.close()
except Exception as e:
  print("[]")
' '${safePath}'`;
    const { stdout } = await executeCommand(sessionId, cmd);

    let jobs: JobRecord[] = [];
    try {
      jobs = JSON.parse(stdout);
      if (!Array.isArray(jobs)) jobs = [];
    } catch {
      jobs = [];
    }

    return NextResponse.json({ jobs });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to read jobs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-bots/jobs
 * Manage jobs: run_now, toggle (enable/disable), create new webhook job.
 */
export async function POST(request: Request) {
  try {
    const {
      sessionId,
      botPath,
      action,
      jobId,
      enabled,
      name,
      schedule,
      handler,
    } = await request.json() as {
      sessionId?: string;
      botPath?: string;
      action?: string;
      jobId?: number | string;
      enabled?: boolean;
      name?: string;
      schedule?: string;
      handler?: string;
    };

    if (!sessionId || !botPath || !action) {
      return NextResponse.json(
        { error: "sessionId, botPath, and action are required" },
        { status: 400 }
      );
    }

    const dbPath = `${botPath}/cron/jobs.db`;

    // Action: run_now — execute the handler: shell command or Cursor CLI prompt
    // Load .env from base path and bot path (same as run_cron_jobs.py) so TELEGRAM_* and other vars
    // are available; otherwise "Run now" runs without them and handlers that send to Telegram won't.
    if (action === "run_now" && handler) {
      const escapedPath = botPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      let runCmd: string;
      if (isShellCommand(handler)) {
        runCmd = `(cd "${escapedPath}" 2>/dev/null && ${handler}) || ${handler}`;
      } else {
        const escapedPrompt = handler.replace(/'/g, "'\"'\"'");
        // Same flags as Telegram/manual server run: --sandbox disabled --force so agent can fetch web, run tools; --output-format text for clean summary
        const agentFlags = "--trust --sandbox disabled --force --output-format text";
        runCmd = `export PATH="$HOME/.local/bin:/usr/local/bin:$PATH" && (cd "${escapedPath}" 2>/dev/null && (cursor ${agentFlags} -p '${escapedPrompt}' 2>/dev/null || agent ${agentFlags} -p '${escapedPrompt}' 2>/dev/null || cursor-agent ${agentFlags} -p '${escapedPrompt}' 2>/dev/null))`;
      }
      // Source base and bot .env so Run now has same env as scheduled runner (TELEGRAM_BOT_TOKEN, etc.)
      const basePath = botPath.replace(/\/agents?\/[^/]+$/, "").trim() || "/var/www/ai";
      const safeBase = basePath.replace(/'/g, "'\"'\"'");
      const safeBot = botPath.replace(/'/g, "'\"'\"'");
      const withEnv = `( set -a; [ -f '${safeBase}/.env' ] && . '${safeBase}/.env'; [ -f '${safeBot}/.env' ] && . '${safeBot}/.env'; set +a; ${runCmd} )`;
      const { stdout, stderr, exitCode } = await executeCommand(sessionId, withEnv);
      const success = exitCode === 0;

      // Update job last_run (and run_count if column exists) so UI shows Runs / Last Run
      if (jobId != null && (typeof jobId === "number" || typeof jobId === "string")) {
        const now = new Date().toISOString().replace("T", " ").substring(0, 19);
        const safePath = dbPath.replace(/'/g, "'\"'\"'");
        const safeId = String(jobId).replace(/'/g, "'\"'\"'");
        const updateCmd = `python3 -c '
import sqlite3, sys
path, job_id, now = sys.argv[1], sys.argv[2], sys.argv[3]
conn = sqlite3.connect(path)
cur = conn.cursor()
try:
  cur.execute("UPDATE jobs SET last_run = ? WHERE id = ?", (now, job_id))
  if cur.rowcount == 0:
    cur.execute("UPDATE cron_jobs SET last_run = ? WHERE id = ?", (now, job_id))
  conn.commit()
  conn.close()
  print("OK")
except Exception as e:
  print("", end="")
' '${safePath}' '${safeId}' '${now}'`;
        await executeCommand(sessionId, updateCmd).catch((err) => {
          console.error("Failed to update job last_run:", err);
        });
      }

      // If job completed and has Telegram delivery config (zeroclaw-style), send stdout to Telegram
      // so "Run now" matches scheduler/daemon behavior (they send job output to delivery.to).
      if (success && stdout && jobId != null && (typeof jobId === "number" || typeof jobId === "string")) {
        const safePath = dbPath.replace(/'/g, "'\"'\"'");
        const safeId = String(jobId).replace(/'/g, "'\"'\"'");
        const getDeliveryCmd = `python3 -c '
import sqlite3, sys, json
path, job_id = sys.argv[1], sys.argv[2]
try:
  conn = sqlite3.connect(path)
  cur = conn.cursor()
  try:
    cur.execute("PRAGMA table_info(cron_jobs)")
    cols = [r[1] for r in cur.fetchall()]
  except Exception:
    cols = []
  chat_id = None
  if "delivery_to" in cols:
    cur.execute("SELECT delivery_to, delivery_channel FROM cron_jobs WHERE id = ?", (job_id,))
    r = cur.fetchone()
    if r and r[1] == "telegram" and r[0]:
      chat_id = str(r[0]).strip()
  if chat_id is None and "delivery" in cols:
    cur.execute("SELECT delivery FROM cron_jobs WHERE id = ?", (job_id,))
    r = cur.fetchone()
    if r and r[0]:
      d = json.loads(r[0]) if isinstance(r[0], str) else r[0]
      if d.get("channel") == "telegram" and d.get("to"):
        chat_id = str(d.get("to")).strip()
  conn.close()
  print(chat_id or "")
except Exception:
  print("")
' '${safePath}' '${safeId}'`;
        const { stdout: deliveryOut } = await executeCommand(sessionId, getDeliveryCmd).catch((err) => {
          console.error("Failed to get delivery config:", err);
          return { stdout: "" };
        });
        const chatId = deliveryOut?.trim();
        if (chatId) {
          const basePath = botPath.replace(/\/agents?\/[^/]+$/, "").trim() || "/var/www/ai";
          const safeBase = basePath.replace(/'/g, "'\"'\"'");
          const safeBot = botPath.replace(/'/g, "'\"'\"'");
          // Telegram message limit 4096; truncate. Build full POST body in a file (chat_id, parse_mode, urlencoded text) then curl -d @file so the message is never literal @path.
          const text = stdout.slice(0, 4000);
          const b64 = Buffer.from(text, "utf8").toString("base64").replace(/'/g, "'\"'\"'");
          const tmpFile = `/tmp/run_now_telegram_${Date.now()}_$$.txt`;
          const bodyFile = `/tmp/run_now_telegram_body_${Date.now()}_$$.txt`;
          const sendCmd = `( set -a; [ -f '${safeBase}/.env' ] && . '${safeBase}/.env'; [ -f '${safeBot}/.env' ] && . '${safeBot}/.env'; set +a; TMPF="${tmpFile}"; BODYF="${bodyFile}"; echo '${b64}' | base64 -d > "$TMPF"; python3 -c "import urllib.parse,sys; p=sys.argv[1]; b=sys.argv[2]; c=sys.argv[3]; open(b,'w').write('chat_id='+c+'&parse_mode=HTML&text='+urllib.parse.quote(open(p).read()))" "$TMPF" "$BODYF" "${chatId.replace(/"/g, '\\"')}"; [ -n "$TELEGRAM_BOT_TOKEN" ] && curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" -d "@$BODYF"; rm -f "$TMPF" "$BODYF" )`;
          await executeCommand(sessionId, sendCmd).catch((err) => {
            console.error("Failed to send job output to Telegram:", err);
          });
        }
      }

      const failureMessage =
        exitCode === 127
          ? "Command not found (exit 127). If this job uses a prompt, ensure Cursor CLI (cursor, agent, or cursor-agent) is on the server PATH; cron may use a minimal environment."
          : stderr?.trim() || `Exit code ${exitCode}`;
      return NextResponse.json({
        stdout,
        stderr,
        exitCode,
        success,
        message: success ? "Job completed" : failureMessage,
      });
    }

    // Action: toggle — enable/disable a job (works for both "jobs" and "cron_jobs")
    if (action === "toggle" && jobId !== undefined && enabled !== undefined) {
      const enableVal = enabled ? 1 : 0;
      const safePath = dbPath.replace(/'/g, "'\"'\"'");
      const safeId = String(jobId).replace(/'/g, "'\"'\"'");
      const cmd = `python3 -c '
import sqlite3, sys
path, job_id, en = sys.argv[1], sys.argv[2], int(sys.argv[3])
conn = sqlite3.connect(path)
cur = conn.cursor()
try:
  cur.execute("UPDATE jobs SET enabled = ? WHERE id = ?", (en, job_id))
  if cur.rowcount == 0:
    cur.execute("UPDATE cron_jobs SET enabled = ? WHERE id = ?", (en, job_id))
  conn.commit()
  conn.close()
  print("OK")
except Exception as e:
  print("", end="")
' '${safePath}' '${safeId}' ${enableVal}`;
      const { stdout } = await executeCommand(sessionId, cmd);
      return NextResponse.json({
        success: stdout.trim() === "OK",
        message: "Job toggled",
      });
    }

    // Action: delete — remove job by id (works for both "jobs" and "cron_jobs")
    if (action === "delete" && jobId !== undefined && jobId !== null) {
      const safePath = dbPath.replace(/'/g, "'\"'\"'");
      const safeId = String(jobId).replace(/'/g, "'\"'\"'");
      const cmd = `python3 -c '
import sqlite3, sys
path, job_id = sys.argv[1], sys.argv[2]
try:
  conn = sqlite3.connect(path)
  cur = conn.cursor()
  cur.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
  n = cur.rowcount
  if n == 0:
    cur.execute("DELETE FROM cron_jobs WHERE id = ?", (job_id,))
    n = cur.rowcount
  conn.commit()
  conn.close()
  if n > 0:
    print("OK")
  else:
    print("NOT_FOUND")
except Exception as e:
  print("ERR:" + str(e), file=sys.stderr)
' '${safePath}' '${safeId}'`;
      const { stdout, stderr } = await executeCommand(sessionId, cmd);
      const out = stdout.trim();
      if (stderr.trim()) {
        return NextResponse.json(
          { success: false, error: stderr.trim() || "Database error" },
          { status: 500 }
        );
      }
      if (out === "OK") {
        return NextResponse.json({ success: true, message: "Job removed" });
      }
      return NextResponse.json(
        { success: false, error: out === "NOT_FOUND" ? "Job not found or already removed" : "Delete failed" },
        { status: 404 }
      );
    }

    // Action: create — insert into "jobs" or "cron_jobs" (Python for portability and cron_jobs schema)
    if (action === "create" && name && schedule && handler) {
      const safePath = dbPath.replace(/'/g, "'\"'\"'");
      const safeName = name.replace(/'/g, "'\"'\"'");
      const safeSchedule = schedule.replace(/'/g, "'\"'\"'");
      const safeHandler = handler.replace(/'/g, "'\"'\"'");
      const cmd = `python3 -c '
import sqlite3, sys, uuid, json
from datetime import datetime
path, name, schedule, handler = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
try:
  conn = sqlite3.connect(path)
  cur = conn.cursor()
  try:
    cur.execute("INSERT INTO jobs (name, schedule, handler, enabled) VALUES (?, ?, ?, 1)", (name, schedule, handler))
    conn.commit()
    conn.close()
    print("OK")
    sys.exit(0)
  except sqlite3.OperationalError:
    pass
  now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000000+00:00")
  schedule_json = json.dumps({"kind": "cron", "expr": schedule, "tz": None})
  job_id = str(uuid.uuid4())
  cur.execute("""INSERT INTO cron_jobs (id, expression, command, schedule, job_type, name, enabled, created_at, next_run)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)""", (job_id, schedule, handler, schedule_json, "shell", name or schedule, now, now))
  conn.commit()
  conn.close()
  print("OK")
except Exception as e:
  print("", end="")
' '${safePath}' '${safeName}' '${safeSchedule}' '${safeHandler}'`;
      const { stdout } = await executeCommand(sessionId, cmd);
      return NextResponse.json({
        success: stdout.trim() === "OK",
        message: "Job created",
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to manage job" },
      { status: 500 }
    );
  }
}
