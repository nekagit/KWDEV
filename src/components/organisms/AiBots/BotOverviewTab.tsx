"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { useBotStatusStore } from "@/store/bot-status-store";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  RotateCw,
  Square,
  Zap,
  Clock,
  Cpu,
  Gauge,
  Plug2,
  MessageCircle,
  Hash,
} from "lucide-react";

interface BotStatus {
  status: "online" | "stopped" | "errored";
  pid: number;
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
}

interface ConnectionEntry {
  type: "telegram" | "slack" | "discord" | "configured";
  name: string;
  connected: boolean;
  details?: {
    type: string;
    username?: string;
    id?: number | string;
    first_name?: string;
    is_bot?: boolean;
    team?: string;
    team_id?: string;
    user?: string;
    user_id?: string;
    url?: string;
    discriminator?: string;
  };
  error?: string;
}

export function BotOverviewTab({
  sessionId,
  botPath,
  botName,
  onRagStatusChange,
}: {
  sessionId: string;
  botPath: string;
  botName: string;
  onRagStatusChange: (enabled: boolean) => void;
}) {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [connections, setConnections] = useState<ConnectionEntry[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const setBotStatus = useBotStatusStore((s) => s.setBotStatus);

  const loadStatus = async () => {
    try {
      const res = await fetch(
        `/api/ai-bots/status?sessionId=${sessionId}&botPath=${encodeURIComponent(botPath)}&botName=${botName}`
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || `Request failed (${res.status})`);
        setBotStatus("error", sessionId, botName);
        setStatus({
          status: "errored",
          pid: 0,
          cpu: 0,
          memory: 0,
          uptime: 0,
          restarts: 0,
        });
        return;
      }
      const safe: BotStatus = {
        status: data.status ?? "stopped",
        pid: Number(data.pid) ?? 0,
        cpu: Number(data.cpu) ?? 0,
        memory: Number(data.memory) ?? 0,
        uptime: Number(data.uptime) ?? 0,
        restarts: Number(data.restarts) ?? 0,
      };
      setStatus(safe);
      // Map BotStatus to BotStatusType
      const mappedStatus: "running" | "stopped" | "error" | "unknown" =
        safe.status === "online" ? "running" : safe.status === "errored" ? "error" : "stopped";
      setBotStatus(mappedStatus, sessionId, botName);
      setError(null);

      // Check if RAG is enabled
      try {
        const configRes = await fetch(
          `/api/ai-bots/config?sessionId=${sessionId}&botPath=${encodeURIComponent(botPath)}`
        );
        const config = await configRes.json();
        if (config.env?.RAG_ENABLED === "true") {
          onRagStatusChange(true);
        }
      } catch {
        // ignore
      }
    } catch (err) {
      setError((err as Error).message);
      setBotStatus("error", sessionId, botName);
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async () => {
    setConnectionsLoading(true);
    try {
      const res = await fetch(
        `/api/ai-bots/connections?sessionId=${sessionId}&botPath=${encodeURIComponent(botPath)}`
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.connections)) {
        setConnections(data.connections);
      } else {
        setConnections([]);
      }
    } catch {
      setConnections([]);
    } finally {
      setConnectionsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // Real-time: 5s when online (live CPU/memory), 10s when stopped/errored
    const ms = status?.status === "online" ? 5000 : 10000;
    const interval = setInterval(loadStatus, ms);
    return () => clearInterval(interval);
  }, [sessionId, botPath, botName, status?.status]);

  useEffect(() => {
    loadConnections();
  }, [sessionId, botPath]);

  const handleAction = async (action: "start" | "stop" | "restart") => {
    setActionLoading(action);
    try {
      const res = await fetch("/api/ai-bots/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action, name: botName, botPath }),
      });

      if (res.ok) {
        await loadStatus();
      } else {
        setError(`Failed to ${action} bot`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay title="Failed to load status" message={error} />;
  }

  if (!status) {
    return <ErrorDisplay title="No status" message="Could not retrieve bot status" />;
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <Card
        className={`border-2 ${
          status.status === "online"
            ? "border-success/50 bg-success/5"
            : "border-destructive/50 bg-destructive/5"
        }`}
      >
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {status.status === "online" ? (
                <CheckCircle2 className="w-8 h-8 text-success" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-destructive" />
              )}
              <div>
                <p className="font-semibold text-lg">
                  {status.status === "online" ? "Running" : "Stopped"}
                </p>
                <p className="text-sm text-muted-foreground">PID: {status.pid || "—"}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {status.status === "online" ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction("stop")}
                    disabled={actionLoading === "stop"}
                  >
                    {actionLoading === "stop" ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Square className="w-4 h-4 mr-1" />
                    )}
                    Stop
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction("restart")}
                    disabled={actionLoading === "restart"}
                  >
                    {actionLoading === "restart" ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <RotateCw className="w-4 h-4 mr-1" />
                    )}
                    Restart
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleAction("start")}
                  disabled={actionLoading === "start"}
                >
                  {actionLoading === "start" ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-1" />
                  )}
                  Start
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => loadStatus()}>
                <RotateCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "CPU Usage", value: `${(status.cpu ?? 0).toFixed(1)}%`, icon: Cpu },
          { label: "Memory", value: `${(status.memory ?? 0).toFixed(0)}MB`, icon: Gauge },
          { label: "Uptime", value: formatUptime(status.uptime ?? 0), icon: Clock },
          { label: "Restarts", value: String(status.restarts ?? 0), icon: Activity },
          { label: "Status", value: status.status ?? "—", icon: Zap },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={i} className="bg-card-tint-1">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plug2 className="w-4 h-4" />
            Connections
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connectionsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No integrations configured (e.g. Telegram, Slack, Discord). Configure in Integrations or via .env.</p>
          ) : (
            <div className="space-y-4">
              {connections.map((conn, i) => (
                <div
                  key={`${conn.name}-${i}`}
                  className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 p-3"
                >
                  <div className="flex items-center gap-2">
                    {conn.type === "telegram" && <MessageCircle className="w-4 h-4 text-[#0088cc]" />}
                    {conn.type === "slack" && <Hash className="w-4 h-4 text-[#4A154B]" />}
                    {conn.type === "discord" && <MessageCircle className="w-4 h-4 text-[#5865F2]" />}
                    {conn.type === "configured" && <Plug2 className="w-4 h-4 text-muted-foreground" />}
                    <span className="font-medium text-sm">{conn.name}</span>
                    {conn.connected && (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 className="w-3 h-3" />
                        Connected
                      </span>
                    )}
                  </div>
                  {conn.error && (
                    <p className="text-xs text-destructive">{conn.error}</p>
                  )}
                  {conn.details && conn.type === "telegram" && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Username</span>
                        <p className="font-mono">@{conn.details.username ?? "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Bot ID</span>
                        <p className="font-mono">{conn.details.id ?? "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Display name</span>
                        <p className="font-mono">{conn.details.first_name ?? "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Link</span>
                        <a
                          href={`https://t.me/${conn.details.username ?? ""}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline block truncate"
                        >
                          t.me/{conn.details.username ?? ""}
                        </a>
                      </div>
                    </div>
                  )}
                  {conn.details && conn.type === "slack" && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {conn.details.team && (
                        <div>
                          <span className="text-muted-foreground">Team</span>
                          <p className="font-mono">{conn.details.team}</p>
                        </div>
                      )}
                      {conn.details.team_id && (
                        <div>
                          <span className="text-muted-foreground">Team ID</span>
                          <p className="font-mono">{conn.details.team_id}</p>
                        </div>
                      )}
                      {conn.details.user && (
                        <div>
                          <span className="text-muted-foreground">User</span>
                          <p className="font-mono">{conn.details.user}</p>
                        </div>
                      )}
                      {conn.details.url && (
                        <div>
                          <span className="text-muted-foreground">Workspace</span>
                          <a
                            href={conn.details.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline block truncate"
                          >
                            {conn.details.url}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  {conn.details && conn.type === "discord" && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Username</span>
                        <p className="font-mono">{conn.details.username ?? "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Application ID</span>
                        <p className="font-mono">{conn.details.id ?? "—"}</p>
                      </div>
                      {conn.details.discriminator && conn.details.discriminator !== "0" && (
                        <div>
                          <span className="text-muted-foreground">Discriminator</span>
                          <p className="font-mono">{conn.details.discriminator}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 pb-3 border-b border-border/30">
              <div className="w-2 h-2 rounded-full bg-success mt-1.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Bot status checked</p>
                <p className="text-xs text-muted-foreground">just now</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pb-3 border-b border-border/30">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Last restart: {status.restarts ?? 0} times total</p>
                <p className="text-xs text-muted-foreground">{Math.floor((status.uptime ?? 0) / 3600)}h uptime</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Monitoring active</p>
                <p className="text-xs text-muted-foreground">
                  Status polls every {status?.status === "online" ? "5" : "10"} seconds
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
