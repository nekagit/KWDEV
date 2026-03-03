import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

export const dynamic = "force-dynamic";

export type ServicesSection = "systemd" | "security" | "firewall" | "ports";

/**
 * GET /api/server/services?sessionId=...&section=systemd|security|firewall|ports
 * - systemd: list active systemd units
 * - security: installed security tools (fail2ban, clamav, auditd, sshd config, etc.)
 * - firewall: ufw/iptables status
 * - ports: listening TCP/UDP ports (ss/netstat)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const section = (searchParams.get("section") || "systemd") as ServicesSection;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const validSections: ServicesSection[] = ["systemd", "security", "firewall", "ports"];
    const sec = validSections.includes(section) ? section : "systemd";

    let text: string;

    if (sec === "systemd") {
      const { stdout, stderr } = await executeCommand(
        sessionId,
        "systemctl list-units --no-pager --no-legend --plain 2>/dev/null | head -80 || echo '(systemctl not available)'"
      );
      text = (stdout + (stderr ? "\n" + stderr : "")).trim() || "No units or systemctl not available.";
    } else if (sec === "security") {
      text = await runSecuritySection(sessionId);
    } else if (sec === "firewall") {
      text = await runFirewallSection(sessionId);
    } else {
      text = await runPortsSection(sessionId);
    }

    return NextResponse.json({ output: text, section: sec });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list services";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function runSecuritySection(sessionId: string): Promise<string> {
  const parts: string[] = [];

  const run = async (label: string, command: string): Promise<string> => {
    try {
      const { stdout, stderr } = await executeCommand(sessionId, command);
      const out = (stdout + (stderr ? "\n" + stderr : "")).trim();
      return out ? `--- ${label} ---\n${out}` : `--- ${label} ---\n(no output)`;
    } catch {
      return `--- ${label} ---\n(not available or error)`;
    }
  };

  parts.push(await run("Fail2ban (status + jails)", "sudo fail2ban-client status 2>/dev/null | head -40 || echo 'fail2ban not installed'"));
  parts.push(await run("ClamAV (clamscan)", "which clamscan && clamscan --version 2>/dev/null || echo 'ClamAV not installed'"));
  parts.push(await run("ClamAV daemon", "systemctl is-active clamav-freshclam clamav-daemon 2>/dev/null || true"));
  parts.push(await run("Auditd", "systemctl is-active auditd 2>/dev/null; auditd --version 2>/dev/null || echo 'auditd not installed'"));
  parts.push(await run("SSH daemon config (sshd -T)", "sshd -T 2>/dev/null | head -25 || echo 'sshd -T not available'"));
  parts.push(await run("Rootkit Hunter", "which rkhunter && rkhunter --version 2>/dev/null | head -3 || echo 'rkhunter not installed'"));
  parts.push(await run("Lynis", "which lynis && lynis show version 2>/dev/null || echo 'lynis not installed'"));
  parts.push(await run("AppArmor", "aa-status 2>/dev/null | head -20 || echo 'AppArmor not active'"));
  parts.push(await run("Last auth failures", "sudo lastb 2>/dev/null | head -15 || echo 'lastb not available'"));

  return parts.filter(Boolean).join("\n\n");
}

async function runFirewallSection(sessionId: string): Promise<string> {
  try {
    const { stdout: ufw } = await executeCommand(
      sessionId,
      "sudo ufw status verbose 2>/dev/null | head -60 || true"
    );
    if (ufw.trim()) {
      const { stdout: ipt } = await executeCommand(
        sessionId,
        "sudo iptables -L -n -v 2>/dev/null | head -50 || true"
      );
      const iptTrim = ipt.trim();
      return `--- UFW ---\n${ufw.trim()}\n\n--- iptables (if UFW not primary) ---\n${iptTrim || '(none)'}`;
    }
    const { stdout, stderr } = await executeCommand(
      sessionId,
      "sudo iptables -L -n -v 2>/dev/null | head -80 || echo 'iptables not available'"
    );
    return (stdout + (stderr ? "\n" + stderr : "")).trim() || "Firewall status not available.";
  } catch {
    return "Failed to read firewall status.";
  }
}

async function runPortsSection(sessionId: string): Promise<string> {
  try {
    const { stdout, stderr } = await executeCommand(
      sessionId,
      "ss -tuln 2>/dev/null || netstat -tuln 2>/dev/null || echo 'ss/netstat not available'"
    );
    const text = (stdout + (stderr ? "\n" + stderr : "")).trim();
    return text || "No listening ports or ss/netstat not available.";
  } catch {
    return "Failed to list listening ports.";
  }
}
