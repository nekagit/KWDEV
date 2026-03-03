import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/server-ssh";

/** Required for static export (output: 'export'). */
export const dynamic = "force-static";

export async function POST(request: Request) {
    try {
        const { sessionId, action, payload } = await request.json();

        if (!sessionId) {
            return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
        }

        let command = "";
        switch (action) {
            case "malware_scan":
                command = "hash rkhunter 2>/dev/null && (rkhunter --check --skip-keypress; R=$?; if [ $R -ne 0 ]; then echo '--- Remediation: updating rkhunter and cleaning threats ---'; rkhunter --update 2>/dev/null; rkhunter --propupd 2>/dev/null; hash clamscan 2>/dev/null && sudo clamscan -r --remove /tmp /var/tmp 2>/dev/null; echo 'Review /var/log/rkhunter.log'; fi) || echo 'rkhunter not installed'";
                break;
            case "firewall_status":
                command = "hash ufw 2>/dev/null && sudo ufw status || sudo iptables -L";
                break;
            case "update_packages":
                command = "hash apt 2>/dev/null && sudo apt update -y && sudo apt list --upgradable || echo 'apt not found. Running yum check-update.' && sudo yum check-update || true";
                break;
            case "apply_updates":
                command = "hash apt 2>/dev/null && sudo apt upgrade -y || sudo yum upgrade -y";
                break;
            case "cron_manager_get":
                command = "crontab -l || echo ''";
                break;
            case "restart_service":
                // payload should be service_name
                command = `sudo systemctl restart ${payload} || sudo service ${payload} restart`;
                break;
            case "port_scanner":
                command = "sudo ss -tulnp || sudo netstat -tulnp || echo 'ss or netstat not available'";
                break;
            case "disk_cleanup":
                command = "hash apt 2>/dev/null && sudo apt autoremove -y && sudo apt clean || sudo yum clean all && sudo journalctl --vacuum-time=3d";
                break;
            case "malicious_activity":
                command = "echo '--- Last Failed Logins ---'; sudo lastb -a -n 10 2>/dev/null || echo 'No lastb access'; echo ''; echo '--- Auth Log Fails ---'; sudo grep 'Failed password' /var/log/auth.log 2>/dev/null | tail -n 10 || echo 'No auth.log access'; echo '--- Securing: reloading fail2ban ---'; sudo fail2ban-client reload 2>/dev/null; echo '--- Blocking IPs with 5+ failed attempts ---'; sudo lastb -a -n 200 2>/dev/null | awk '{print $3}' | grep -E '^[0-9.]+$' | sort | uniq -c | sort -rn | while read count ip; do [ \"$count\" -ge 5 ] && sudo ufw deny from \"$ip\" 2>/dev/null; done; echo 'Done.'";
                break;
            case "custom_command":
                command = payload || "";
                break;
            case "view_log":
                command = `sudo tail -n 100 ${payload || '/var/log/syslog'}`;
                break;
            default:
                return NextResponse.json({ error: "Unknown action" }, { status: 400 });
        }

        if (!command) {
            return NextResponse.json({ error: "Empty command generated" }, { status: 400 });
        }

        const { stdout, stderr } = await executeCommand(sessionId, command);
        return NextResponse.json({ stdout, stderr });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to execute action" }, { status: 500 });
    }
}
