import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";
import { parsePm2Json, cwdMatchesBotPath, parseDotEnv } from "@/lib/zeroclaw-parser";

function escapeShellPath(p: string): string {
  return p.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/`/g, "\\`");
}

/** Fetch CPU %, memory (MB), and uptime (s) for a process by PID via ps. Used when bot is not in PM2. */
async function getProcessStats(
  sessionId: string,
  pid: number
): Promise<{ cpu: number; memory: number; uptime: number }> {
  if (!pid || pid <= 0) return { cpu: 0, memory: 0, uptime: 0 };
  try {
    // Linux: pcpu=%, rss=KB, etimes=elapsed seconds. = suppresses header.
    const { stdout } = await executeCommand(
      sessionId,
      `ps -o pcpu=,rss=,etimes= -p ${pid} 2>/dev/null || echo ''`
    );
    const line = stdout.trim();
    if (!line) return { cpu: 0, memory: 0, uptime: 0 };
    const parts = line.split(/\s+/);
    const cpu = parseFloat(parts[0]) || 0;
    const rssKb = parseInt(parts[1], 10) || 0;
    const memoryMb = rssKb / 1024;
    const uptime = parseInt(parts[2], 10) || 0;
    return { cpu, memory: Math.round(memoryMb * 10) / 10, uptime };
  } catch {
    return { cpu: 0, memory: 0, uptime: 0 };
  }
}

/** Status depends on request (sessionId, botPath); must be dynamic. */
export const dynamic = "force-dynamic";

/**
 * GET /api/ai-bots/status
 * Get bot process status via pm2 jlist. Prefers process whose cwd matches botPath (e.g. /var/www/ai).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const botPath = searchParams.get("botPath");
    const botName = searchParams.get("botName") || "zeroclaw";

    if (!sessionId || !botPath) {
      return NextResponse.json({ error: "sessionId and botPath are required" }, { status: 400 });
    }

    const { stdout: pmOutput } = await executeCommand(sessionId, "pm2 jlist 2>/dev/null || echo '[]'");
    const processes = parsePm2Json(pmOutput);

    // 1) Prefer process whose cwd equals or is under botPath (e.g. /var/www/ai)
    let botProcess = processes.find((p) => cwdMatchesBotPath(p.cwd, botPath));
    // 2) Fall back to first process with matching name
    if (!botProcess) {
      botProcess = processes.find((p) => p.name === botName);
    }

    // Helper: check if bot port is listening (source of truth when PM2 says stopped)
    const safePath = escapeShellPath(botPath);
    const envOut = await executeCommand(sessionId, `cat "${safePath}/.env" 2>/dev/null || echo ''`).then((r) => r.stdout).catch(() => "");
    const env = parseDotEnv(envOut);
    const port = env.BOT_PORT || env.PORT;
    let portListening: { pid: number } | null = null;
    if (port && /^\d+$/.test(port.trim())) {
      const { stdout: lsofOut } = await executeCommand(
        sessionId,
        `lsof -ti :${port.trim()} 2>/dev/null || ss -tlnp 2>/dev/null | grep ":${port.trim()}" | head -1 || echo ''`
      );
      const listening = lsofOut.trim();
      if (listening) {
        const pidMatch = listening.match(/^\d+/);
        portListening = { pid: pidMatch ? parseInt(pidMatch[0], 10) : 0 };
      }
    }

    // If PM2 says stopped but port is listening, bot is actually running (e.g. started outside PM2 or PM2 state stale)
    if (botProcess && botProcess.status !== "online" && portListening) {
      const pid = portListening.pid || botProcess.pid;
      const stats = await getProcessStats(sessionId, pid);
      return NextResponse.json({
        status: "online",
        pid,
        cpu: stats.cpu || botProcess.cpu,
        memory: stats.memory || botProcess.memory,
        uptime: stats.uptime || botProcess.uptime,
        restarts: botProcess.restarts,
      });
    }

    if (botProcess) {
      return NextResponse.json({
        status: botProcess.status,
        pid: botProcess.pid,
        cpu: botProcess.cpu,
        memory: botProcess.memory,
        uptime: botProcess.uptime,
        restarts: botProcess.restarts,
      });
    }

    // Fallback: pgrep for node process with botPath or "zeroclaw" in command line
    const { stdout: psOutput } = await executeCommand(sessionId, "pgrep -af node 2>/dev/null || echo ''");
    const nodeMatch = psOutput
      .split("\n")
      .find((line) => line.includes(botPath) || line.includes("zeroclaw"));
    if (nodeMatch) {
      const pidFromLine = nodeMatch.trim().match(/^\d+/);
      const pid = pidFromLine ? parseInt(pidFromLine[0], 10) : 0;
      const stats = await getProcessStats(sessionId, pid);
      return NextResponse.json({
        status: "online",
        pid,
        cpu: stats.cpu,
        memory: stats.memory,
        uptime: stats.uptime,
        restarts: 0,
      });
    }

    // Fallback: zeroclaw is a Rust binary (not node) — e.g. /var/www/ai/zero/zeroclaw/target/release/zeroclaw channel start
    const { stdout: zeroclawOutput } = await executeCommand(sessionId, "pgrep -af zeroclaw 2>/dev/null || echo ''");
    const zeroclawLine = zeroclawOutput.split("\n").filter((l) => l.trim()).shift();
    if (zeroclawLine) {
      const pidFromLine = zeroclawLine.trim().match(/^\d+/);
      const pid = pidFromLine ? parseInt(pidFromLine[0], 10) : 0;
      const stats = await getProcessStats(sessionId, pid);
      return NextResponse.json({
        status: "online",
        pid,
        cpu: stats.cpu,
        memory: stats.memory,
        uptime: stats.uptime,
        restarts: 0,
      });
    }

    // Fallback: port listening means bot is online
    if (portListening) {
      const stats = await getProcessStats(sessionId, portListening.pid);
      return NextResponse.json({
        status: "online",
        pid: portListening.pid,
        cpu: stats.cpu,
        memory: stats.memory,
        uptime: stats.uptime,
        restarts: 0,
      });
    }

    return NextResponse.json({
      status: "stopped",
      pid: 0,
      cpu: 0,
      memory: 0,
      uptime: 0,
      restarts: 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to get bot status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
