import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

const WORKSPACE_PATH = "$HOME/kwcode-server";

/** Escape content for shell: single quote -> '\'' so echo '...' is safe. */
function escapeForEcho(content: string): string {
  return content.replace(/'/g, "'\\''");
}

/** Default prompt files: filename (under workspace) and content. */
const DEFAULT_PROMPTS: { file: string; content: string }[] = [
  {
    file: "check-malicious-activity.prompt.txt",
    content:
      "Check for malicious activity: review last failed logins and auth failures, report any suspicious patterns.",
  },
  {
    file: "disk-usage.prompt.txt",
    content:
      "Show disk usage for the main filesystems (df -h), list largest directories in /var and $HOME (du), and suggest what could be cleaned.",
  },
  {
    file: "top-processes.prompt.txt",
    content:
      "List top 15 processes by CPU and memory (ps or top one-liner). Summarize what is using the most resources.",
  },
  {
    file: "recent-logs.prompt.txt",
    content:
      "Show last 50 lines of syslog (or journalctl) and highlight any errors or warnings. Suggest follow-up if needed.",
  },
  {
    file: "list-services.prompt.txt",
    content:
      "List systemd services that are enabled and running. Identify any failed or inactive important services.",
  },
  {
    file: "list-cron.prompt.txt",
    content:
      "List all user and system cron jobs (crontab -l, /etc/crontab, /etc/cron.d). Summarize schedule and purpose if inferable.",
  },
  {
    file: "check-updates.prompt.txt",
    content:
      "Check for available package updates (apt list --upgradable or yum check-update). Do not apply; only report and suggest reboot if kernel updated.",
  },
  {
    file: "backup-checklist.prompt.txt",
    content:
      "Review common backup locations (/var/backups, /home backups, DB dumps). List what exists and suggest a short backup checklist for this server.",
  },
  {
    file: "network-connections.prompt.txt",
    content:
      "Show listening TCP/UDP ports (ss -tuln or netstat) and established connections. Highlight unusual or high-count listeners.",
  },
  {
    file: "firewall-status.prompt.txt",
    content:
      "Show firewall status and rules (ufw status, iptables -L, or firewalld). Summarize allowed ports and services.",
  },
  {
    file: "cert-expiry.prompt.txt",
    content:
      "Find TLS/SSL certificates under /etc (letsencrypt, ssl, certs) and report expiration dates. Warn if any expire within 30 days.",
  },
  {
    file: "docker-status.prompt.txt",
    content:
      "If Docker is installed, list containers (running and stopped), images, and disk usage. Otherwise say Docker not found.",
  },
  {
    file: "nginx-apache-status.prompt.txt",
    content:
      "If nginx or Apache is installed, show version and enabled sites/config snippet. Report if they are running and listening.",
  },
  {
    file: "database-status.prompt.txt",
    content:
      "If MySQL/MariaDB or PostgreSQL is installed, report version and whether the service is running. Do not expose passwords.",
  },
  {
    file: "free-memory.prompt.txt",
    content:
      "Show memory and swap usage (free -h). Interpret available vs used and suggest if more RAM or swap is needed.",
  },
  {
    file: "security-hardening.prompt.txt",
    content:
      "Quick security check: SSH config (PermitRootLogin, PasswordAuthentication), unattended-upgrades or similar, and open ports. Suggest one or two hardening steps.",
  },
  {
    file: "restart-service.prompt.txt",
    content:
      "List failed or recently restarted systemd units. Suggest which service might need a restart and the safe command to restart it.",
  },
  {
    file: "clean-old-logs.prompt.txt",
    content:
      "List log files under /var/log that are older than 30 days and their sizes. Suggest which could be rotated or removed safely.",
  },
  {
    file: "quick-health.prompt.txt",
    content:
      "One-liner health summary: uptime, load, disk usage of /, memory usage, and whether critical services (ssh, cron, your main app) are running.",
  },
];

const README_CONTENT = `KWCode server workspace.

- .prompt.txt / .prompt.md: run with Cursor CLI (Run button in Scripts & Prompts tab).
- .txt: can also be run as prompts from the tab.
- .sh: run as bash scripts.

Add your own files here for quick actions.`;

/** Required for static export (output: 'export'). */
export const dynamic = "force-static";

/**
 * POST /api/server/workspace/init
 * Creates ~/kwcode-server on the remote server and seeds default prompt/script files.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = body as { sessionId?: string };

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    await executeCommand(sessionId, `mkdir -p ${WORKSPACE_PATH}`);

    for (const { file, content } of DEFAULT_PROMPTS) {
      const escaped = escapeForEcho(content);
      await executeCommand(
        sessionId,
        `echo '${escaped}' > ${WORKSPACE_PATH}/${file}`
      );
    }

    const escapedReadme = escapeForEcho(README_CONTENT);
    await executeCommand(sessionId, `echo '${escapedReadme}' > ${WORKSPACE_PATH}/README.txt`);

    return NextResponse.json({ success: true, path: WORKSPACE_PATH });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Workspace init failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
