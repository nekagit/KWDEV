import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

export const dynamic = "force-dynamic";

/**
 * GET /api/server/logs/metrics?sessionId=...
 * Returns KPI counts for the Logs dashboard: failed logins, auth errors, etc.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    // Run lightweight commands to get counts (avoid pulling full logs)
    const script = `
FAILED_LOGINS=$(lastb 2>/dev/null | wc -l)
AUTH_FAIL_HOUR=$(grep -c "Failed password\\|Invalid user" /var/log/auth.log 2>/dev/null || echo 0)
SYSLOG_ERR_RECENT=$(tail -1000 /var/log/syslog 2>/dev/null | grep -ci "error\\|critical\\|fail" || echo 0)
DISK_LOG_PCT=$(df /var/log 2>/dev/null | awk 'NR==2 {gsub(/%/,""); print $5}' || echo 0)
echo "FAILED_LOGINS=$FAILED_LOGINS"
echo "AUTH_FAIL_HOUR=$AUTH_FAIL_HOUR"
echo "SYSLOG_ERR_RECENT=$SYSLOG_ERR_RECENT"
echo "DISK_LOG_PCT=$DISK_LOG_PCT"
`;
    const { stdout } = await executeCommand(sessionId, script);
    const failedLogins = parseInt(stdout.match(/FAILED_LOGINS=(\d+)/)?.[1] ?? "0", 10);
    const authFailLastHour = parseInt(stdout.match(/AUTH_FAIL_HOUR=(\d+)/)?.[1] ?? "0", 10);
    const syslogErrorsRecent = parseInt(stdout.match(/SYSLOG_ERR_RECENT=(\d+)/)?.[1] ?? "0", 10);
    const diskLogPct = parseInt(stdout.match(/DISK_LOG_PCT=(\d+)/)?.[1] ?? "0", 10);

    return NextResponse.json({
      failedLogins,
      authFailLastHour,
      syslogErrorsRecent,
      diskLogPct,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch log metrics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
