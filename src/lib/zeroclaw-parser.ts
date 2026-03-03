/**
 * ZeroClaw and pm2 output parsing utilities.
 */

export interface Pm2ProcessInfo {
  name: string;
  pid: number;
  status: "online" | "stopped" | "errored" | "stopping" | "unknown";
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
  /** Working directory (pm2_env.pm_cwd or pm2_env.cwd). Used to match process by botPath. */
  cwd?: string;
}

export interface CronJob {
  id: string;
  name: string;
  schedule: string; // cron expression
  handler: string; // path to handler file
  status: "active" | "paused" | "errored";
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  errorCount: number;
}

export interface BotMetrics {
  requestsToday: number;
  avgLatency: number; // ms
  errorRate: number; // 0-100
  totalTokens: number;
  uptime: number; // seconds
}

/**
 * Parse .env file content into key/value pairs.
 */
export function parseDotEnv(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key) {
      result[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
  return result;
}

/**
 * Parse pm2 human-readable "show" output.
 * Expects output from `pm2 show <app> --no-color`
 */
export function parsePm2Show(text: string): Pm2ProcessInfo | null {
  const lines = text.split("\n");
  const result: Partial<Pm2ProcessInfo> = {};

  for (const line of lines) {
    if (line.includes("status")) {
      const match = line.match(/status\s+│\s+(\w+)/);
      if (match) result.status = (match[1].toLowerCase() as any) || "unknown";
    }
    if (line.includes("pid")) {
      const match = line.match(/pid\s+│\s+(\d+)/);
      if (match) result.pid = parseInt(match[1], 10);
    }
    if (line.includes("cpu")) {
      const match = line.match(/cpu\s+│\s+([\d.]+)%?/);
      if (match) result.cpu = parseFloat(match[1]);
    }
    if (line.includes("memory")) {
      const match = line.match(/memory\s+│\s+([\d.]+)\s*MB?/);
      if (match) result.memory = parseFloat(match[1]);
    }
    if (line.includes("restarts")) {
      const match = line.match(/restarts\s+│\s+(\d+)/);
      if (match) result.restarts = parseInt(match[1], 10);
    }
    if (line.includes("uptime")) {
      const match = line.match(/uptime\s+│\s+([\d\w\s]+)/);
      if (match) {
        const upStr = match[1].trim();
        // Parse "5 days, 4h, 30m" format
        let seconds = 0;
        const dayMatch = upStr.match(/(\d+)\s*d/i);
        if (dayMatch) seconds += parseInt(dayMatch[1], 10) * 86400;
        const hourMatch = upStr.match(/(\d+)\s*h/i);
        if (hourMatch) seconds += parseInt(hourMatch[1], 10) * 3600;
        const minMatch = upStr.match(/(\d+)\s*m/i);
        if (minMatch) seconds += parseInt(minMatch[1], 10) * 60;
        result.uptime = seconds;
      }
    }
  }

  if (!result.name || !result.pid) return null;
  return result as Pm2ProcessInfo;
}

/**
 * Parse pm2 list JSON output.
 * Expects JSON from `pm2 jlist`. Includes cwd for matching process by botPath.
 */
export function parsePm2Json(jsonText: string): Pm2ProcessInfo[] {
  try {
    const list = JSON.parse(jsonText) as any[];
    return list.map((item) => {
      const env = item.pm2_env ?? {};
      const cwd = env.pm_cwd ?? env.cwd ?? "";
      return {
        name: item.name,
        pid: item.pid,
        status: env.status || "unknown",
        cpu: item.monit?.cpu || 0,
        memory: (item.monit?.memory || 0) / 1024 / 1024, // bytes to MB
        uptime: env.created_at ? Math.floor((Date.now() - env.created_at) / 1000) : 0,
        restarts: env.restart_time || 0,
        cwd: typeof cwd === "string" ? cwd : "",
      };
    });
  } catch {
    return [];
  }
}

/** Normalize path for comparison: trim, strip trailing slash. */
export function normalizePathForMatch(p: string): string {
  return (p || "").trim().replace(/\/+$/, "") || "/";
}

/** True if process cwd equals or is under botPath (so we match /var/www/ai or /var/www/ai/app). */
export function cwdMatchesBotPath(processCwd: string | undefined, botPath: string): boolean {
  if (!processCwd) return false;
  const a = normalizePathForMatch(processCwd);
  const b = normalizePathForMatch(botPath);
  return a === b || a.startsWith(b + "/");
}

/**
 * Parse crontab -l output into CronJob array.
 */
export function parseCrontab(text: string): CronJob[] {
  const jobs: CronJob[] = [];
  const lines = text.split("\n");
  let jobIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Simple cron line: MM HH DD MM DOW command
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 6) {
      const schedule = parts.slice(0, 5).join(" ");
      const handler = parts.slice(5).join(" ");
      jobs.push({
        id: `cron-${jobIndex}`,
        name: `Cron ${jobIndex + 1}`,
        schedule,
        handler,
        status: "active",
        runCount: 0,
        errorCount: 0,
      });
      jobIndex++;
    }
  }

  return jobs;
}

/**
 * Parse access/application log lines for request metrics.
 * Assumes log format: "LEVEL TIMESTAMP MESSAGE"
 * Returns estimated metrics from sampling the logs.
 */
export function parseAccessLog(lines: string[]): BotMetrics {
  let requestsToday = 0;
  let errorRate = 0;
  let totalTokens = 0;
  let totalLatency = 0;
  let latencyCount = 0;
  let errorCount = 0;

  for (const line of lines) {
    // Count requests
    if (line.includes("POST") || line.includes("GET") || line.includes("request")) {
      requestsToday++;
    }

    // Count errors
    if (line.includes("ERROR") || line.includes("error")) {
      errorCount++;
    }

    // Extract latency (assumes format: "latency: 123ms")
    const latencyMatch = line.match(/latency[:\s]+(\d+)\s*ms/i);
    if (latencyMatch) {
      totalLatency += parseInt(latencyMatch[1], 10);
      latencyCount++;
    }

    // Extract tokens (assumes format: "tokens: 456" or "tokens_used: 456")
    const tokenMatch = line.match(/tokens[_used]*[:\s]+(\d+)/i);
    if (tokenMatch) {
      totalTokens += parseInt(tokenMatch[1], 10);
    }
  }

  return {
    requestsToday,
    avgLatency: latencyCount > 0 ? totalLatency / latencyCount : 0,
    errorRate: requestsToday > 0 ? (errorCount / requestsToday) * 100 : 0,
    totalTokens,
    uptime: 0, // Filled in separately from pm2 data
  };
}

/**
 * Human-readable cron schedule description.
 */
export function describeCronSchedule(expression: string): string {
  const parts = expression.split(/\s+/);
  if (parts.length < 5) return expression;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Simple heuristics
  if (minute === "0" && hour === "8" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return "Every day at 8:00 AM";
  }
  if (minute === "*" && hour === "*") {
    return "Every minute";
  }
  if (minute === "0" && hour === "*") {
    return "Every hour";
  }
  if (minute === "0" && hour === "0") {
    return "Every day at midnight";
  }

  return expression;
}
