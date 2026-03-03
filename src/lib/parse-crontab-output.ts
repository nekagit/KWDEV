/**
 * Parses the raw crontab output from the server (crontab -l, /etc/crontab, /etc/cron.d/*)
 * into structured sections and line types for UI display.
 */

export type CronLineType = "comment" | "empty" | "variable" | "job";

export interface ParsedCronLine {
  type: CronLineType;
  raw: string;
  /** Cron schedule (5 fields: min hour dom month dow) */
  schedule?: string;
  /** User (system crontab only) */
  user?: string;
  /** Command part */
  command?: string;
  /** Variable name (e.g. SHELL, PATH) */
  key?: string;
  /** Variable value */
  value?: string;
}

export interface ParsedCronFile {
  path: string;
  lines: ParsedCronLine[];
}

export interface ParsedCrontab {
  userSection: { title: string; content: string; lines: ParsedCronLine[] };
  systemCrontabSection: { title: string; content: string; lines: ParsedCronLine[] };
  cronDSection: { title: string; files: ParsedCronFile[] };
  raw: string;
}

const SECTION_HEADER = /^=== (.+?) ===\s*$/;

/** Detect if a line is a cron job (5 or 6 time fields). 6th field can be user in system crontab. */
function parseCronJobLine(line: string): Partial<ParsedCronLine> | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const parts = trimmed.split(/\s+/);
  if (parts.length < 6) return null;
  const schedule = parts.slice(0, 5).join(" ");
  const rest = parts.slice(5).join(" ");
  if (!rest) return null;
  // 6th field: if it looks like a username (alphanumeric, hyphen), treat as user and rest as command
  const sixth = parts[5];
  const looksLikeUser = /^[a-zA-Z0-9_-]+$/.test(sixth) && sixth.length < 32;
  if (looksLikeUser && parts.length > 6) {
    return {
      type: "job",
      raw: trimmed,
      schedule,
      user: sixth,
      command: parts.slice(6).join(" "),
    };
  }
  return {
    type: "job",
    raw: trimmed,
    schedule,
    command: rest,
  };
}

/** Parse a block of cron content into typed lines. */
export function parseCronLines(content: string): ParsedCronLine[] {
  const lines = content.split(/\n/);
  const result: ParsedCronLine[] = [];
  for (const line of lines) {
    const raw = line;
    const trimmed = line.trim();
    if (trimmed === "") {
      result.push({ type: "empty", raw });
      continue;
    }
    if (trimmed.startsWith("#")) {
      result.push({ type: "comment", raw });
      continue;
    }
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) {
      result.push({
        type: "variable",
        raw,
        key: match[1],
        value: match[2].trim(),
      });
      continue;
    }
    const job = parseCronJobLine(line);
    if (job && job.schedule) {
      result.push({
        type: "job",
        raw: job.raw ?? trimmed,
        schedule: job.schedule,
        user: job.user,
        command: job.command,
      });
      continue;
    }
    result.push({ type: "comment", raw });
  }
  return result;
}

/**
 * Parse full crontab output string into sections and structured data.
 */
export function parseCrontabOutput(output: string): ParsedCrontab | null {
  if (!output || typeof output !== "string") return null;

  const sections: { title: string; content: string }[] = [];
  const sectionRegex = /=== ([^=]+?) ===\s*\n([\s\S]*?)(?=\n=== |$)/g;
  let m: RegExpExecArray | null;
  while ((m = sectionRegex.exec(output)) !== null) {
    sections.push({ title: m[1].trim(), content: m[2].trimEnd() });
  }

  const userSection = sections.find((s) =>
    s.title.toLowerCase().includes("user crontab")
  );
  const systemCrontabSection = sections.find((s) =>
    s.title.toLowerCase().includes("system") && s.title.includes("/etc/crontab")
  );
  const cronDSection = sections.find((s) =>
    s.title.toLowerCase().includes("/etc/cron.d")
  );

  const files: ParsedCronFile[] = [];
  if (cronDSection?.content) {
    const fileRegex = /--- (\/[^\s]+) ---\n([\s\S]*?)(?=--- \/|$)/g;
    let match: RegExpExecArray | null;
    while ((match = fileRegex.exec(cronDSection.content)) !== null) {
      files.push({
        path: match[1],
        lines: parseCronLines(match[2].trimEnd()),
      });
    }
  }

  return {
    userSection: {
      title: userSection?.title ?? "User crontab (crontab -l)",
      content: userSection?.content ?? "",
      lines: parseCronLines(userSection?.content ?? ""),
    },
    systemCrontabSection: {
      title: systemCrontabSection?.title ?? "System: /etc/crontab",
      content: systemCrontabSection?.content ?? "",
      lines: parseCronLines(systemCrontabSection?.content ?? ""),
    },
    cronDSection: {
      title: cronDSection?.title ?? "System: /etc/cron.d/",
      files,
    },
    raw: output,
  };
}
