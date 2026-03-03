"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Server, Loader2, Terminal, PanelLeftClose, PanelLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { SSHConfigHost } from "@/lib/parse-ssh-config";
import { getServerApiUrl } from "@/lib/server-api-url";

const SIDEBAR_COLLAPSED_WIDTH = 48;

export function ServerSSHConfigSidebar({
  onConnect,
  isConnected,
  collapsed = false,
  onToggleCollapse,
  width = 224,
}: {
  onConnect: (sessionId: string, label?: string) => void;
  isConnected: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  width?: number;
}) {
  const [hosts, setHosts] = useState<SSHConfigHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingHost, setConnectingHost] = useState<string | null>(null);

  const fetchHosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getServerApiUrl("/api/server/ssh-config"));
      const data = await res.json();
      if (res.ok) {
        setHosts(data.hosts ?? []);
      } else {
        setError(data.error ?? "Failed to load SSH config");
      }
    } catch {
      setError("Failed to load SSH config");
      setHosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  const handleConnect = useCallback(
    async (entry: SSHConfigHost) => {
      if (isConnected) return;
      setConnectingHost(entry.host);
      try {
        const res = await fetch(getServerApiUrl("/api/server/connect"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sshConfigHost: entry.host }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success("Connected via SSH");
          onConnect(data.sessionId, entry.host);
        } else {
          toast.error(data.error ?? "Connection failed");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Connection failed");
      } finally {
        setConnectingHost(null);
      }
    },
    [isConnected, onConnect]
  );

  if (collapsed) {
    return (
      <div
        className="flex flex-col h-full border-r border-border/60 bg-sidebar/50 shrink-0 items-center py-3 gap-2"
        style={{ width: SIDEBAR_COLLAPSED_WIDTH }}
      >
        <Terminal className="size-5 text-muted-foreground shrink-0" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider [writing-mode:vertical-rl] rotate-180 select-none">
          SSH
        </span>
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 mt-auto"
            onClick={onToggleCollapse}
            title="Expand SSH config"
            aria-label="Expand SSH config sidebar"
          >
            <PanelLeft className="size-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full border-r border-border/60 bg-sidebar/50 shrink-0"
      style={{ width }}
    >
      <div className="shrink-0 px-3 py-3 border-b border-border/40 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Terminal className="size-4 text-muted-foreground shrink-0" />
            <span className="truncate">SSH config</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            Connect using ~/.ssh/config
          </p>
        </div>
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            aria-label="Collapse SSH config sidebar"
          >
            <PanelLeftClose className="size-3.5" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-0.5">
          {loading && (
            <div className="flex items-center gap-2 px-2 py-3 text-muted-foreground text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          )}
          {error && !loading && (
            <p className="px-2 py-2 text-xs text-destructive">{error}</p>
          )}
          {!loading && !error && hosts.length === 0 && (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              No hosts in ~/.ssh/config
            </p>
          )}
          {!loading &&
            hosts.map((entry) => {
              const isConnecting = connectingHost === entry.host;
              return (
                <button
                  key={entry.host}
                  type="button"
                  disabled={isConnected || isConnecting}
                  onClick={() => handleConnect(entry)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                    "hover:bg-accent/50 hover:text-accent-foreground",
                    "disabled:opacity-50 disabled:pointer-events-none",
                    isConnecting && "bg-accent/50"
                  )}
                >
                  {isConnecting ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <Server className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate font-medium">{entry.host}</span>
                  {entry.hostName && (
                    <span className="truncate text-xs text-muted-foreground ml-auto">
                      {entry.hostName}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </ScrollArea>
    </div>
  );
}
