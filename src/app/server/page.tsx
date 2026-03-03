"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { ServerConnectionPanel } from "@/components/organisms/ServerDashboard/ServerConnectionPanel";
import { ServerSSHConfigSidebar } from "@/components/organisms/ServerDashboard/ServerSSHConfigSidebar";
import { ServerStatsGrid } from "@/components/organisms/ServerDashboard/ServerStatsGrid";
import { ServerQuickActions } from "@/components/organisms/ServerDashboard/ServerQuickActions";
import { ServerTerminal } from "@/components/organisms/ServerDashboard/ServerTerminal";
import { ServerAgentFAB } from "@/components/organisms/ServerDashboard/ServerAgentFAB";
import { SERVER_TERMINAL_ID } from "@/components/organisms/ServerDashboard/ServerTerminalScrollButton";
import { ServerWorkspaceTab } from "@/components/organisms/ServerDashboard/ServerWorkspaceTab";
import { ServerLogsTab } from "@/components/organisms/ServerDashboard/ServerLogsTab";
import { ServerCronTab } from "@/components/organisms/ServerDashboard/ServerCronTab";
import { ServerServicesTab } from "@/components/organisms/ServerDashboard/ServerServicesTab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { hasValidSessionId } from "@/lib/server-session";
import { useServerConnectionStore } from "@/store/server-connection-store";

const SSH_SIDEBAR_STORAGE_KEY = "kwcode-server-ssh-sidebar-width";
const SSH_SIDEBAR_COLLAPSED_KEY = "kwcode-server-ssh-sidebar-collapsed";
const SSH_SIDEBAR_MIN = 180;
const SSH_SIDEBAR_MAX = 420;
const SSH_SIDEBAR_DEFAULT = 224;

function getStoredSshSidebarWidth(): number {
  if (typeof window === "undefined") return SSH_SIDEBAR_DEFAULT;
  const stored = localStorage.getItem(SSH_SIDEBAR_STORAGE_KEY);
  if (stored == null) return SSH_SIDEBAR_DEFAULT;
  const n = parseInt(stored, 10);
  return Number.isFinite(n) ? Math.min(SSH_SIDEBAR_MAX, Math.max(SSH_SIDEBAR_MIN, n)) : SSH_SIDEBAR_DEFAULT;
}

/** Default collapsed (true). Only expanded if user explicitly stored "false". */
function getStoredSshSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SSH_SIDEBAR_COLLAPSED_KEY) !== "false";
}

export default function ServerManagementPage() {
  const { sessionId, connectedLabel, setConnection, clearConnection } = useServerConnectionStore();
  const isSessionValid = hasValidSessionId(sessionId);

  useEffect(() => {
    if (sessionId != null && !hasValidSessionId(sessionId)) {
      clearConnection();
    }
  }, [sessionId, clearConnection]);

  const [sshSidebarCollapsed, setSshSidebarCollapsed] = useState(true);
  const [sshSidebarWidth, setSshSidebarWidth] = useState(SSH_SIDEBAR_DEFAULT);
  const [isResizing, setIsResizing] = useState(false);
  const [serverTab, setServerTab] = useState("overview");
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(SSH_SIDEBAR_DEFAULT);
  const lastWidthRef = useRef(SSH_SIDEBAR_DEFAULT);

  useEffect(() => {
    setSshSidebarWidth(getStoredSshSidebarWidth());
  }, []);
  useEffect(() => {
    setSshSidebarCollapsed(getStoredSshSidebarCollapsed());
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(SSH_SIDEBAR_COLLAPSED_KEY, String(sshSidebarCollapsed));
    } catch (_) {}
  }, [sshSidebarCollapsed]);

  const handleConnect = useCallback(
    (id: string, label?: string) => {
      setConnection(id, label);
      setSshSidebarCollapsed(true);
    },
    [setConnection]
  );

  const handleDisconnect = useCallback(() => {
    clearConnection();
  }, [clearConnection]);

  const handleToggleSshSidebar = useCallback(() => {
    setSshSidebarCollapsed((prev) => !prev);
  }, []);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = sshSidebarWidth;
    },
    [sshSidebarWidth]
  );

  useEffect(() => {
    if (!isResizing) return;
    document.body.classList.add("select-none", "cursor-col-resize");
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      const next = Math.min(
        SSH_SIDEBAR_MAX,
        Math.max(SSH_SIDEBAR_MIN, resizeStartWidth.current + delta)
      );
      lastWidthRef.current = next;
      setSshSidebarWidth(next);
    };
    const onUp = () => {
      setIsResizing(false);
      document.body.classList.remove("select-none", "cursor-col-resize");
      const toStore = Math.min(SSH_SIDEBAR_MAX, Math.max(SSH_SIDEBAR_MIN, lastWidthRef.current));
      try {
        localStorage.setItem(SSH_SIDEBAR_STORAGE_KEY, String(Math.round(toStore)));
      } catch (_) {}
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      document.body.classList.remove("select-none", "cursor-col-resize");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing]);

  return (
    <div className="flex-1 w-full min-h-full flex bg-background relative selection:bg-indigo-500/30">
      <ServerSSHConfigSidebar
        onConnect={handleConnect}
        isConnected={!!sessionId}
        collapsed={sshSidebarCollapsed}
        onToggleCollapse={handleToggleSshSidebar}
        width={sshSidebarWidth}
      />
      {!sshSidebarCollapsed && (
        <div
          role="separator"
          aria-label="Resize SSH sidebar"
          className="absolute top-0 w-0.5 h-full cursor-col-resize hover:w-1 hover:bg-primary/25 active:bg-primary/40 rounded-full transition-[width,background] duration-150 shrink-0 z-10"
          style={{ left: sshSidebarWidth }}
          onMouseDown={startResize}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="container p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Server Management
              </h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Connect to a remote server to view live metrics, act on security
                events, and manage system resources over SSH.
              </p>
            </div>
          </div>

          <ServerConnectionPanel
            onConnect={(id) => handleConnect(id)}
            onDisconnect={handleDisconnect}
            isConnected={isSessionValid}
            currentSessionId={isSessionValid ? sessionId : null}
            connectedLabel={connectedLabel}
          />

          {isSessionValid && sessionId && (
            <div className="space-y-6 mt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
              <Tabs value={serverTab} onValueChange={setServerTab} className="w-full">
                <TabsList className="mb-4 flex flex-nowrap gap-1 p-1.5 w-full max-w-full overflow-x-auto">
                  <TabsTrigger value="overview" className="min-w-[5rem]">Overview</TabsTrigger>
                  <TabsTrigger value="scripts" className="min-w-[7rem]">Scripts &amp; Prompts</TabsTrigger>
                  <TabsTrigger value="logs" className="min-w-[5rem]">Logs</TabsTrigger>
                  <TabsTrigger value="cron" className="min-w-[5rem]">Cron</TabsTrigger>
                  <TabsTrigger value="services" className="min-w-[5rem]">Services</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-6 mt-0">
                  <ServerStatsGrid sessionId={sessionId} />

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    <ServerQuickActions sessionId={sessionId} />

                    <div id={SERVER_TERMINAL_ID} className="xl:sticky xl:top-6 scroll-mt-4">
                      <ServerTerminal sessionId={sessionId} />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="scripts" className="mt-0">
                  <ServerWorkspaceTab sessionId={sessionId} />
                </TabsContent>
                <TabsContent value="logs" className="mt-0">
                  <ServerLogsTab sessionId={sessionId} />
                </TabsContent>
                <TabsContent value="cron" className="mt-0">
                  <ServerCronTab sessionId={sessionId} />
                </TabsContent>
                <TabsContent value="services" className="mt-0">
                  <ServerServicesTab sessionId={sessionId} />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {isSessionValid && sessionId && <ServerAgentFAB sessionId={sessionId} />}

        </div>
      </div>
    </div>
  );
}
