"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Network,
  Lock,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { getServerApiUrl } from "@/lib/server-api-url";
import { scrollToServerTerminal } from "@/components/organisms/ServerDashboard/ServerTerminalScrollButton";

export type ServicesSubTab = "systemd" | "security" | "firewall" | "ports";

const SUB_TABS: { value: ServicesSubTab; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "systemd", label: "Systemd", icon: <Server className="size-4" />, description: "Active systemd units (services, timers). May not be available on minimal or non-systemd systems." },
  { value: "security", label: "Security tools", icon: <ShieldCheck className="size-4" />, description: "Installed security tools: Fail2ban, ClamAV, Auditd, SSH config, rkhunter, Lynis, AppArmor, auth failures." },
  { value: "firewall", label: "Firewall", icon: <Lock className="size-4" />, description: "UFW and iptables status. Control and monitor firewall rules." },
  { value: "ports", label: "Listening ports", icon: <Network className="size-4" />, description: "TCP/UDP listening ports (ss/netstat)." },
];

export function ServerServicesTab({ sessionId }: { sessionId: string }) {
  const [activeTab, setActiveTab] = useState<ServicesSubTab>("systemd");
  const [outputBySection, setOutputBySection] = useState<Partial<Record<ServicesSubTab, string | null>>>({});
  const [loadingBySection, setLoadingBySection] = useState<Partial<Record<ServicesSubTab, boolean>>>({});

  const fetchSection = useCallback(
    async (section: ServicesSubTab) => {
      setLoadingBySection((prev) => ({ ...prev, [section]: true }));
      try {
        const res = await fetch(
          getServerApiUrl(`/api/server/services?sessionId=${encodeURIComponent(sessionId)}&section=${section}`)
        );
        const data = await res.json();
        if (!res.ok) throw new Error((data as { error?: string }).error || `Failed to load ${section}`);
        setOutputBySection((prev) => ({ ...prev, [section]: (data as { output?: string }).output ?? "" }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : `Failed to load ${section}`);
        setOutputBySection((prev) => ({ ...prev, [section]: null }));
      } finally {
        setLoadingBySection((prev) => ({ ...prev, [section]: false }));
      }
    },
    [sessionId]
  );

  useEffect(() => {
    fetchSection(activeTab);
  }, [activeTab, fetchSection]);

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="size-4 text-emerald-400" />
              Services &amp; security
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Monitor and control systemd units, security tools, firewall, and listening ports.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={scrollToServerTerminal} className="gap-1.5 shrink-0">
            <Terminal className="size-3.5" />
            View terminal
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ServicesSubTab)} className="w-full">
          <TabsList className="mb-3 flex flex-wrap gap-1">
            {SUB_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                {t.icon}
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {SUB_TABS.map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-0 space-y-3">
              <p className="text-xs text-muted-foreground">{t.description}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchSection(t.value)} disabled={loadingBySection[t.value]}>
                  {loadingBySection[t.value] ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Refresh
                </Button>
              </div>
              <pre className="rounded-md bg-muted/50 border border-border/50 p-4 text-xs font-mono overflow-x-auto overflow-y-auto max-h-[420px] whitespace-pre-wrap break-words">
                {loadingBySection[t.value] && outputBySection[t.value] == null
                  ? "Loading…"
                  : outputBySection[t.value] ?? "No output"}
              </pre>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
