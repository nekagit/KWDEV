"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Server, Bot, Cpu, HardDrive, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useServerConnectionStore } from "@/store/server-connection-store";
import { hasValidSessionId } from "@/lib/server-session";
import { getServerApiUrl } from "@/lib/server-api-url";

interface ServerStats {
  system?: { hostname?: string; os?: string };
  cpu?: { usage?: number; cores?: number };
  memory?: { total?: number; used?: number };
}

interface AgentInfo {
  name: string;
  path: string;
  hasSkill: boolean;
  hasMemory: boolean;
  hasJobs: boolean;
  hasStates: boolean;
}

export function DashboardServerAndBots() {
  const { sessionId, connectedLabel } = useServerConnectionStore();
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAgents, setLoadingAgents] = useState(true);

  const validSession = hasValidSessionId(sessionId);

  const fetchStats = useCallback(async () => {
    if (!validSession || !sessionId) return;
    try {
      const res = await fetch(
        getServerApiUrl(`/api/server/stats?sessionId=${encodeURIComponent(sessionId)}`)
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.memory) setServerStats(data);
      else setServerStats(null);
    } catch {
      setServerStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [sessionId, validSession]);

  const fetchAgents = useCallback(async () => {
    if (!validSession || !sessionId) return;
    try {
      const res = await fetch(
        getServerApiUrl(
          `/api/ai-bots/agents?sessionId=${encodeURIComponent(sessionId)}&basePath=/var/www/ai`
        )
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data?.agents)) setAgents(data.agents);
      else setAgents([]);
    } catch {
      setAgents([]);
    } finally {
      setLoadingAgents(false);
    }
  }, [sessionId, validSession]);

  useEffect(() => {
    if (!validSession) {
      setLoadingStats(false);
      setLoadingAgents(false);
      setServerStats(null);
      setAgents([]);
      return;
    }
    fetchStats();
    fetchAgents();
  }, [validSession, fetchStats, fetchAgents]);

  if (!validSession) return null;

  const memPercent =
    serverStats?.memory?.total && serverStats.memory.total > 0
      ? (serverStats.memory.used! / serverStats.memory.total) * 100
      : 0;

  return (
    <section aria-label="Server and AI Bots" className="grid gap-3 sm:grid-cols-2">
      {/* Server info */}
      <Card className="shadow-card border-border/50 bg-card-tint-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Server className="size-4 text-primary" />
            Server: {connectedLabel ?? "Connected"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingStats ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading stats…
            </div>
          ) : serverStats ? (
            <>
              <div className="text-sm">
                <p className="font-medium truncate" title={serverStats.system?.hostname}>
                  {serverStats.system?.hostname ?? "—"}
                </p>
                {serverStats.system?.os && (
                  <p className="text-xs text-muted-foreground truncate">{serverStats.system.os}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1">
                      <Cpu className="size-3" /> CPU
                    </span>
                    <span className="font-medium">{serverStats.cpu?.usage ?? 0}%</span>
                  </div>
                  <Progress value={serverStats.cpu?.usage ?? 0} className="h-1.5" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1">
                      <HardDrive className="size-3" /> Memory
                    </span>
                    <span className="font-medium">{memPercent.toFixed(0)}%</span>
                  </div>
                  <Progress value={memPercent} className="h-1.5" />
                </div>
              </div>
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/server">
                  Open Server
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Stats unavailable</p>
          )}
        </CardContent>
      </Card>

      {/* AI Bots */}
      <Card className="shadow-card border-border/50 bg-card-tint-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="size-4 text-violet-500" />
            AI Bots
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingAgents ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading agents…
            </div>
          ) : agents.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {agents.slice(0, 8).map((a) => (
                  <span
                    key={a.path}
                    className="inline-flex items-center rounded-md bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-400"
                  >
                    {a.name}
                  </span>
                ))}
                {agents.length > 8 && (
                  <span className="text-xs text-muted-foreground">+{agents.length - 8} more</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{agents.length} agent(s) on server</p>
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/ai-bots">
                  Open AI Bots
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">No agents found under /var/www/ai</p>
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/ai-bots">
                  Open AI Bots
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
