"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Server, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useServerConnectionStore } from "@/store/server-connection-store";
import { hasValidSessionId } from "@/lib/server-session";
import { getServerApiUrl } from "@/lib/server-api-url";
import { isTauri } from "@/lib/tauri";
import { getDefaultSshHost } from "@/lib/default-ssh-host";

export function DashboardQuickConnect() {
  const defaultHost = getDefaultSshHost();
  const { sessionId, connectedLabel, setConnection } = useServerConnectionStore();
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const autoConnectAttempted = useRef(false);

  const isConnected = hasValidSessionId(sessionId);
  const isConnectedToQuick = isConnected && defaultHost !== null && connectedLabel === defaultHost;

  useEffect(() => {
    if (!defaultHost) {
      setAvailable(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(getServerApiUrl("/api/server/ssh-config"))
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.hosts?.some((h: { host: string }) => h.host === defaultHost)) {
          setAvailable(true);
        }
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [defaultHost]);

  // In Tauri: auto-connect to default host once when available and not already connected
  useEffect(() => {
    if (!defaultHost || !isTauri || !available || isConnected || connecting || autoConnectAttempted.current) return;
    autoConnectAttempted.current = true;
    setConnecting(true);
    fetch(getServerApiUrl("/api/server/connect"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sshConfigHost: defaultHost }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.sessionId) {
          setConnection(data.sessionId, defaultHost);
          toast.success(`Connected to ${defaultHost}`);
        }
      })
      .catch(() => {})
      .finally(() => setConnecting(false));
  }, [defaultHost, available, isConnected, connecting, setConnection]);

  const handleConnect = useCallback(async () => {
    if (!defaultHost || isConnected || connecting) return;
    setConnecting(true);
    try {
      const res = await fetch(getServerApiUrl("/api/server/connect"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sshConfigHost: defaultHost }),
      });
      const data = await res.json();
      if (res.ok) {
        setConnection(data.sessionId, defaultHost);
        toast.success(`Connected to ${defaultHost}`);
      } else {
        toast.error(data.error ?? "Connection failed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }, [defaultHost, isConnected, connecting, setConnection]);

  if (!defaultHost || loading || !available) return null;

  return (
    <section aria-label="Quick connect">
      <Card className="shadow-card hover:shadow-card-hover transition-all duration-300 border-border/50 bg-card-tint-1">
      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-primary/10 border-primary/20 text-primary">
            <Server className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">Quick connect</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isConnectedToQuick ? `Connected to ${defaultHost}` : "SSH from ~/.ssh/config"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnectedToQuick ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/server">
                Open Server
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={connecting}
              onClick={() => void handleConnect()}
              aria-label={`Connect to ${defaultHost}`}
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <>
                  Connect to {defaultHost}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
    </section>
  );
}
