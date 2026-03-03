"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2,
  RefreshCw,
  ShieldAlert,
  FileText,
  Lock,
  Globe,
  HardDrive,
  AlertTriangle,
  Activity,
  Terminal,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { getServerApiUrl } from "@/lib/server-api-url";
import { scrollToServerTerminal } from "@/components/organisms/ServerDashboard/ServerTerminalScrollButton";

type LogType = "security" | "syslog" | "auth" | "nginx" | "custom";

const LINES_OPTIONS = [50, 100, 200, 500];

interface LogMetrics {
  failedLogins: number;
  authFailLastHour: number;
  syslogErrorsRecent: number;
  diskLogPct: number;
}

export function ServerLogsTab({ sessionId }: { sessionId: string }) {
  const [logType, setLogType] = useState<LogType>("security");
  const [customPath, setCustomPath] = useState("/var/log/nginx/error.log");
  const [lines, setLines] = useState(80);
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<LogMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const res = await fetch(
        getServerApiUrl(`/api/server/logs/metrics?sessionId=${encodeURIComponent(sessionId)}`)
      );
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to fetch metrics");
      setMetrics(data as LogMetrics);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load metrics");
      setMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  }, [sessionId]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sessionId,
        type: logType,
        lines: String(lines),
      });
      if (logType === "custom" && customPath.trim()) params.set("path", customPath.trim());
      const res = await fetch(getServerApiUrl(`/api/server/logs?${params}`));
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to fetch logs");
      setOutput((data as { output?: string }).output ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load logs");
      setOutput(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId, logType, lines, customPath]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* KPI / Metrics cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Failed logins
                </p>
                <p className="text-2xl font-bold mt-1">
                  {metricsLoading ? (
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  ) : (
                    metrics?.failedLogins ?? "—"
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">lastb total</p>
              </div>
              <ShieldAlert className="size-8 text-rose-500/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Auth failures
                </p>
                <p className="text-2xl font-bold mt-1">
                  {metricsLoading ? (
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  ) : (
                    metrics?.authFailLastHour ?? "—"
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">auth.log</p>
              </div>
              <Lock className="size-8 text-amber-500/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-sky-500/20 bg-sky-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Syslog errors
                </p>
                <p className="text-2xl font-bold mt-1">
                  {metricsLoading ? (
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  ) : (
                    metrics?.syslogErrorsRecent ?? "—"
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">last 1000 lines</p>
              </div>
              <AlertTriangle className="size-8 text-sky-500/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  /var/log disk
                </p>
                <p className="text-2xl font-bold mt-1">
                  {metricsLoading ? (
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  ) : (
                    metrics?.diskLogPct != null ? `${metrics.diskLogPct}%` : "—"
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">usage</p>
              </div>
              <HardDrive className="size-8 text-emerald-500/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Log viewer with sub-tabs */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                Log viewer
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Select a log type and refresh. Requires read access to /var/log on the server.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyTextToClipboard(output ?? "")}
              className="gap-1.5 shrink-0"
              title="Copy full log output"
            >
              <Copy className="size-3.5" />
              Copy
            </Button>
            <Button variant="ghost" size="sm" onClick={scrollToServerTerminal} className="gap-1.5 shrink-0">
              <Terminal className="size-3.5" />
              View terminal
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={logType} onValueChange={(v) => setLogType(v as LogType)}>
            <TabsList className="flex flex-wrap gap-1 h-auto p-1">
              <TabsTrigger value="security" className="gap-1.5 text-xs">
                <ShieldAlert className="size-3.5" />
                Security
              </TabsTrigger>
              <TabsTrigger value="syslog" className="gap-1.5 text-xs">
                <Activity className="size-3.5" />
                Syslog
              </TabsTrigger>
              <TabsTrigger value="auth" className="gap-1.5 text-xs">
                <Lock className="size-3.5" />
                Auth
              </TabsTrigger>
              <TabsTrigger value="nginx" className="gap-1.5 text-xs">
                <Globe className="size-3.5" />
                Nginx
              </TabsTrigger>
              <TabsTrigger value="custom" className="gap-1.5 text-xs">
                <FileText className="size-3.5" />
                Custom
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <label className="text-xs text-muted-foreground">Lines:</label>
              <div className="flex gap-1">
                {LINES_OPTIONS.map((n) => (
                  <Button
                    key={n}
                    variant={lines === n ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setLines(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
              {logType === "custom" && (
                <Input
                  placeholder="/var/log/..."
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  className="h-8 text-xs font-mono max-w-[280px]"
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { fetchLogs(); fetchMetrics(); }}
                disabled={loading}
                className="gap-1.5"
              >
                {loading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchMetrics}
                disabled={metricsLoading}
                className="gap-1.5 text-muted-foreground"
              >
                {metricsLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Refresh KPIs
              </Button>
            </div>

            <TabsContent value="security" className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">
                Failed logins (lastb) and auth/syslog failure lines.
              </p>
              <pre className="rounded-md bg-[#0C0C0C] border border-border/50 p-4 text-xs font-mono text-emerald-400/90 overflow-x-auto overflow-y-auto max-h-[420px] whitespace-pre-wrap break-words">
                {loading && output == null ? "Loading…" : output ?? "No output"}
              </pre>
            </TabsContent>
            <TabsContent value="syslog" className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">
                /var/log/syslog — general system log.
              </p>
              <pre className="rounded-md bg-[#0C0C0C] border border-border/50 p-4 text-xs font-mono text-emerald-400/90 overflow-x-auto overflow-y-auto max-h-[420px] whitespace-pre-wrap break-words">
                {loading && output == null ? "Loading…" : output ?? "No output"}
              </pre>
            </TabsContent>
            <TabsContent value="auth" className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">
                /var/log/auth.log — authentication and authorization.
              </p>
              <pre className="rounded-md bg-[#0C0C0C] border border-border/50 p-4 text-xs font-mono text-emerald-400/90 overflow-x-auto overflow-y-auto max-h-[420px] whitespace-pre-wrap break-words">
                {loading && output == null ? "Loading…" : output ?? "No output"}
              </pre>
            </TabsContent>
            <TabsContent value="nginx" className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">
                Nginx error.log and access.log (if readable).
              </p>
              <pre className="rounded-md bg-[#0C0C0C] border border-border/50 p-4 text-xs font-mono text-emerald-400/90 overflow-x-auto overflow-y-auto max-h-[420px] whitespace-pre-wrap break-words">
                {loading && output == null ? "Loading…" : output ?? "No output"}
              </pre>
            </TabsContent>
            <TabsContent value="custom" className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">
                Tail any file under /var/log. Enter path above (e.g. /var/log/nginx/access.log).
              </p>
              <pre className="rounded-md bg-[#0C0C0C] border border-border/50 p-4 text-xs font-mono text-emerald-400/90 overflow-x-auto overflow-y-auto max-h-[420px] whitespace-pre-wrap break-words">
                {loading && output == null ? "Loading…" : output ?? "No output"}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
