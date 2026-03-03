"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TerminalSquare, ShieldAlert, Bug, Shield, RefreshCw, Clock, FileText, Play, Trash2, Radar } from "lucide-react";
import { toast } from "sonner";
import { getServerApiUrl } from "@/lib/server-api-url";
import { dispatchServerTerminalRanAndOpenFloating } from "@/components/organisms/ServerDashboard/ServerTerminalScrollButton";

async function injectIntoTerminal(sessionId: string, type: "agent" | "command", payload: { prompt?: string; command?: string }) {
    const res = await fetch(getServerApiUrl("/api/server/terminal/inject"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, type, ...payload }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Inject failed");
    }
}

function getQuickActionCommand(action: string, payload?: string): string {
    switch (action) {
        case "malware_scan":
            return "hash rkhunter 2>/dev/null && (rkhunter --check --skip-keypress; R=$?; if [ $R -ne 0 ]; then echo '--- Remediation: updating rkhunter and cleaning threats ---'; rkhunter --update 2>/dev/null; rkhunter --propupd 2>/dev/null; hash clamscan 2>/dev/null && sudo clamscan -r --remove /tmp /var/tmp 2>/dev/null; echo 'Review /var/log/rkhunter.log'; fi) || echo 'rkhunter not installed'";
        case "firewall_status":
            return "hash ufw 2>/dev/null && sudo ufw status || sudo iptables -L";
        case "update_packages":
            return "hash apt 2>/dev/null && sudo apt update -y && sudo apt list --upgradable || echo 'apt not found. Running yum check-update.' && sudo yum check-update || true";
        case "apply_updates":
            return "hash apt 2>/dev/null && sudo apt upgrade -y || sudo yum upgrade -y";
        case "cron_manager_get":
            return "crontab -l || echo ''";
        case "restart_service":
            return `sudo systemctl restart ${payload ?? "nginx"} || sudo service ${payload ?? "nginx"} restart`;
        case "port_scanner":
            return "sudo ss -tulnp || sudo netstat -tulnp || echo 'ss or netstat not available'";
        case "disk_cleanup":
            return "hash apt 2>/dev/null && sudo apt autoremove -y && sudo apt clean || sudo yum clean all && sudo journalctl --vacuum-time=3d";
        case "malicious_activity":
            return "echo '--- Last Failed Logins ---'; sudo lastb -a -n 10 2>/dev/null || echo 'No lastb access'; echo ''; echo '--- Auth Log Fails ---'; sudo grep 'Failed password' /var/log/auth.log 2>/dev/null | tail -n 10 || echo 'No auth.log access'; echo '--- Securing: reloading fail2ban ---'; sudo fail2ban-client reload 2>/dev/null; echo '--- Blocking IPs with 5+ failed attempts ---'; sudo lastb -a -n 200 2>/dev/null | awk '{print $3}' | grep -E '^[0-9.]+$' | sort | uniq -c | sort -rn | while read count ip; do [ \"$count\" -ge 5 ] && sudo ufw deny from \"$ip\" 2>/dev/null; done; echo 'Done.'";
        case "custom_command":
            return payload ?? "";
        case "view_log":
            return `sudo tail -n 100 ${payload ?? "/var/log/syslog"}`;
        default:
            return "";
    }
}

export function ServerQuickActions({ sessionId }: { sessionId: string }) {
    const [customCommand, setCustomCommand] = useState("");
    const [serviceName, setServiceName] = useState("nginx");

    const runInTerminal = async (title: string, action: string, payload?: string) => {
        const command = getQuickActionCommand(action, payload);
        if (!command.trim()) {
            toast.error("Unknown action");
            return;
        }
        try {
            await injectIntoTerminal(sessionId, "command", { command });
            dispatchServerTerminalRanAndOpenFloating(sessionId);
            toast.success(`${title} → running in terminal`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to run in terminal");
        }
    };

    return (
        <>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TerminalSquare className="size-4 text-emerald-400" /> Quick Actions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">

                        {/* Security */}
                        <Button type="button" variant="outline" className="justify-start gap-2 h-auto py-3 whitespace-normal text-left" onClick={() => runInTerminal("Check Malicious Activity", "malicious_activity")}>
                            <ShieldAlert className="size-4 text-rose-400 shrink-0" />
                            <div>
                                <div className="font-semibold text-xs">Check Malicious Activity</div>
                                <div className="text-[10px] text-muted-foreground">lastb, auth.log; auto-secure: fail2ban, block IPs 5+</div>
                            </div>
                        </Button>

                        <Button type="button" variant="outline" className="justify-start gap-2 h-auto py-3 whitespace-normal text-left" onClick={() => runInTerminal("Malware Scan", "malware_scan")}>
                            <Bug className="size-4 text-rose-500 shrink-0" />
                            <div>
                                <div className="font-semibold text-xs">Malware Scan</div>
                                <div className="text-[10px] text-muted-foreground">rkhunter check; if found: update, clamav remove</div>
                            </div>
                        </Button>

                        <Button type="button" variant="outline" className="justify-start gap-2 h-auto py-3 whitespace-normal text-left" onClick={() => runInTerminal("Firewall Status", "firewall_status")}>
                            <Shield className="size-4 text-emerald-500 shrink-0" />
                            <div>
                                <div className="font-semibold text-xs">Firewall Status</div>
                                <div className="text-[10px] text-muted-foreground">List ufw or iptables rules</div>
                            </div>
                        </Button>

                        {/* System */}
                        <Button type="button" variant="outline" className="justify-start gap-2 h-auto py-3 whitespace-normal text-left" onClick={() => runInTerminal("Check Updates", "update_packages")}>
                            <RefreshCw className="size-4 text-amber-400 shrink-0" />
                            <div>
                                <div className="font-semibold text-xs">Check Updates</div>
                                <div className="text-[10px] text-muted-foreground">apt update / list upgradable</div>
                            </div>
                        </Button>

                        <Button type="button" variant="outline" className="justify-start gap-2 h-auto py-3 whitespace-normal text-left" onClick={() => runInTerminal("Apply Updates", "apply_updates")}>
                            <Play className="size-4 text-indigo-400 shrink-0" />
                            <div>
                                <div className="font-semibold text-xs">Apply Updates</div>
                                <div className="text-[10px] text-muted-foreground">apt upgrade -y</div>
                            </div>
                        </Button>

                        <Button type="button" variant="outline" className="justify-start gap-2 h-auto py-3 whitespace-normal text-left" onClick={() => runInTerminal("Disk Cleanup", "disk_cleanup")}>
                            <Trash2 className="size-4 text-slate-400 shrink-0" />
                            <div>
                                <div className="font-semibold text-xs">Disk Cleanup</div>
                                <div className="text-[10px] text-muted-foreground">apt clean, journalctl vacuum</div>
                            </div>
                        </Button>

                        <Button type="button" variant="outline" className="justify-start gap-2 h-auto py-3 whitespace-normal text-left" onClick={() => runInTerminal("View Cron Jobs", "cron_manager_get")}>
                            <Clock className="size-4 text-sky-400 shrink-0" />
                            <div>
                                <div className="font-semibold text-xs">View Cron Jobs</div>
                                <div className="text-[10px] text-muted-foreground">crontab -l</div>
                            </div>
                        </Button>

                        <Button type="button" variant="outline" className="justify-start gap-2 h-auto py-3 whitespace-normal text-left" onClick={() => runInTerminal("Port Scanner", "port_scanner")}>
                            <Radar className="size-4 text-fuchsia-400 shrink-0" />
                            <div>
                                <div className="font-semibold text-xs">Port Scanner</div>
                                <div className="text-[10px] text-muted-foreground">ss -tulnp / netstat</div>
                            </div>
                        </Button>

                        <Button type="button" variant="outline" className="justify-start gap-2 h-auto py-3 whitespace-normal text-left" onClick={() => runInTerminal("View Syslog", "view_log", "/var/log/syslog")}>
                            <FileText className="size-4 text-emerald-400 shrink-0" />
                            <div>
                                <div className="font-semibold text-xs">View Syslog</div>
                                <div className="text-[10px] text-muted-foreground">tail -n 100 /var/log/syslog</div>
                            </div>
                        </Button>

                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="Service name (e.g. nginx)"
                                value={serviceName}
                                onChange={(e) => setServiceName(e.target.value)}
                                className="text-xs h-9"
                            />
                            <Button type="button" size="sm" onClick={() => runInTerminal(`Restart ${serviceName}`, "restart_service", serviceName)}>
                                Restart
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <Input
                                placeholder="Custom command (e.g. ls -la)"
                                value={customCommand}
                                onChange={(e) => setCustomCommand(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && runInTerminal("Custom command", "custom_command", customCommand)}
                                className="text-xs h-9 font-mono flex-1 min-w-[140px]"
                            />
                            <Button type="button" size="sm" variant="secondary" onClick={() => runInTerminal("Custom command", "custom_command", customCommand)}>
                                Run
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
