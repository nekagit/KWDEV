"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Loader2, Server } from "lucide-react";
import { useServerConnectionStore } from "@/store/server-connection-store";
import { hasValidSessionId } from "@/lib/server-session";
import { getServerApiUrl } from "@/lib/server-api-url";
import { isTauri } from "@/lib/tauri";
import { toast } from "sonner";
import { getDefaultSshHost } from "@/lib/default-ssh-host";
import { BotOverviewTab } from "@/components/organisms/AiBots/BotOverviewTab";
import { BotJobsTab } from "@/components/organisms/AiBots/BotJobsTab";
import { BotMemoryTab } from "@/components/organisms/AiBots/BotMemoryTab";
import { BotSkillsTab } from "@/components/organisms/AiBots/BotSkillsTab";
import { BotStatesTab } from "@/components/organisms/AiBots/BotStatesTab";
import { BotTemplatesTab } from "@/components/organisms/AiBots/BotTemplatesTab";
import { BotEnvTab } from "@/components/organisms/AiBots/BotEnvTab";
import { BotContactsTab } from "@/components/organisms/AiBots/BotContactsTab";
import { BotWebTab } from "@/components/organisms/AiBots/BotWebTab";
import { ServerAgentFAB } from "@/components/organisms/ServerDashboard/ServerAgentFAB";

const AGENTS_BASE = "/var/www/ai/agents";

/**
 * Folder names to never show as agent tabs (not part of zeroclaw core).
 * We only show folders that have cron, memory, skills, or states.
 */
const IGNORED_AGENT_FOLDERS = ["node_modules", ".git", "agent-playground"];

/**
 * Only show agents that have at least one zeroclaw-relevant feature:
 * cron (jobs), memory, skills, or states. Excludes package.json and custom
 * scripts that are unrelated to zeroclaw.
 */
function isZeroclawRelevantAgent(agent: {
  name: string;
  hasSkill: boolean;
  hasMemory: boolean;
  hasJobs: boolean;
  hasStates: boolean;
}) {
  if (IGNORED_AGENT_FOLDERS.includes(agent.name)) return false;
  return agent.hasSkill || agent.hasMemory || agent.hasJobs || agent.hasStates;
}

interface Agent {
  name: string;
  path: string;
  hasSkill: boolean;
  hasMemory: boolean;
  hasJobs: boolean;
  hasStates: boolean;
}

interface FileEntry {
  name: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
}

function AgentFilesystemTree({
  sessionId,
  rootPath,
}: {
  sessionId: string;
  rootPath: string;
}) {
  const [loadedDirs, setLoadedDirs] = useState<Record<string, FileEntry[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadDir = useCallback(
    async (path: string) => {
      if (loadedDirs[path] != null) return;
      setLoading((prev) => new Set(prev).add(path));
      setError(null);
      try {
        const res = await fetch(
          `/api/ai-bots/files?sessionId=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(path)}`
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to list directory");
          return;
        }
        setLoadedDirs((prev) => ({ ...prev, [path]: data.files || [] }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading((prev) => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
      }
    },
    [sessionId, loadedDirs]
  );

  useEffect(() => {
    loadDir(rootPath);
  }, [rootPath, loadDir]);

  useEffect(() => {
    if (loadedDirs[rootPath] != null) {
      setExpanded((prev) => (prev.has(rootPath) ? prev : new Set(prev).add(rootPath)));
    }
  }, [rootPath, loadedDirs[rootPath]]);

  const toggleExpand = (path: string) => {
    if (!loadedDirs[path]) loadDir(path);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const formatSize = (n: number | undefined) => {
    if (n == null) return "";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderEntries = (path: string) => {
    const entries = loadedDirs[path];
    if (!entries) return null;
    return (
      <div className="pl-4 border-l border-border/40 ml-2 space-y-0.5">
        {entries.map((entry) => {
          const fullPath = path.replace(/\/+$/, "") + "/" + entry.name;
          const isDir = entry.type === "directory";
          const childExpanded = expanded.has(fullPath);
          const childLoaded = loadedDirs[fullPath] != null;
          const isLoading = loading.has(fullPath);

          if (isDir) {
            return (
              <div key={fullPath}>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full text-left py-1 px-2 rounded hover:bg-muted/60 text-sm"
                  onClick={() => toggleExpand(fullPath)}
                >
                  {childLoaded ? (
                    childExpanded ? (
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    )
                  ) : isLoading ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  {childExpanded ? (
                    <FolderOpen className="size-4 shrink-0 text-amber-500" />
                  ) : (
                    <Folder className="size-4 shrink-0 text-amber-500" />
                  )}
                  <span className="truncate font-medium">{entry.name}</span>
                </button>
                {childExpanded && childLoaded && renderEntries(fullPath)}
              </div>
            );
          }
          return (
            <div
              key={fullPath}
              className="flex items-center gap-2 py-1 px-2 rounded text-sm text-muted-foreground"
            >
              <span className="w-4 shrink-0" />
              <File className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate flex-1">{entry.name}</span>
              {entry.size != null && (
                <span className="text-xs shrink-0">{formatSize(entry.size)}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const rootEntries = loadedDirs[rootPath];
  const rootExpanded = expanded.has(rootPath);
  const rootLoading = loading.has(rootPath);

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2 py-1 px-2 rounded text-sm font-medium text-muted-foreground">
        {rootLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : rootEntries != null ? (
          <button
            type="button"
            className="flex items-center gap-2 hover:bg-muted/60 rounded px-1 -mx-1"
            onClick={() => toggleExpand(rootPath)}
          >
            {rootExpanded ? (
              <ChevronDown className="size-4 shrink-0" />
            ) : (
              <ChevronRight className="size-4 shrink-0" />
            )}
            <FolderOpen className="size-4 shrink-0 text-amber-500" />
            <span>{rootPath}</span>
          </button>
        ) : (
          <span>{rootPath}</span>
        )}
      </div>
      {rootExpanded && rootEntries != null && renderEntries(rootPath)}
    </div>
  );
}

/** Section tabs for a tier: Overview, Cron, Skills, Playground, Memory, States, Env, Files, Templates. */
function TierSectionTabs({
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
  const [sectionTab, setSectionTab] = useState("overview");
  const [skillInsertContent, setSkillInsertContent] = useState<string | null>(null);
  const [skillInsertContentAppend, setSkillInsertContentAppend] = useState<string | null>(null);
  const [jobInsertData, setJobInsertData] = useState<{ name: string; schedule: string; handler: string } | null>(null);
  const [playgroundMessage, setPlaygroundMessage] = useState<string | null>(null);

  const handleTemplateSkillInsert = (content: string) => {
    setSkillInsertContent(content);
    setSectionTab("skills");
  };

  const handleInsertWebSkill = (content: string) => {
    setSkillInsertContentAppend(content);
    setSectionTab("skills");
  };

  const handleTemplateJobInsert = (name: string, schedule: string, handler: string) => {
    setJobInsertData({ name, schedule, handler });
    setSectionTab("cron");
  };

  const handleTemplatePlaygroundInsert = (message: string) => {
    setPlaygroundMessage(message);
    setSectionTab("playground");
  };

  return (
    <Card className="w-full min-w-0 overflow-hidden">
      <CardContent className="pt-6 min-w-0">
        <Tabs value={sectionTab} onValueChange={setSectionTab} className="w-full min-w-0">
          <TabsList className="mb-4 flex flex-wrap justify-start content-start gap-1.5 w-full rounded-xl py-1.5 min-h-11 h-auto">
            <TabsTrigger value="overview" className="px-3 py-1.5 text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="cron" className="px-3 py-1.5 text-xs sm:text-sm">Cron</TabsTrigger>
            <TabsTrigger value="skills" className="px-3 py-1.5 text-xs sm:text-sm">Skills</TabsTrigger>
            <TabsTrigger value="web" className="px-3 py-1.5 text-xs sm:text-sm">Web</TabsTrigger>
            <TabsTrigger value="playground" className="px-3 py-1.5 text-xs sm:text-sm">Playground</TabsTrigger>
            <TabsTrigger value="memory" className="px-3 py-1.5 text-xs sm:text-sm">Memory</TabsTrigger>
            <TabsTrigger value="states" className="px-3 py-1.5 text-xs sm:text-sm">States</TabsTrigger>
            <TabsTrigger value="env" className="px-3 py-1.5 text-xs sm:text-sm">Env</TabsTrigger>
            <TabsTrigger value="files" className="px-3 py-1.5 text-xs sm:text-sm">Files</TabsTrigger>
            <TabsTrigger value="contacts" className="px-3 py-1.5 text-xs sm:text-sm">Contacts</TabsTrigger>
            <TabsTrigger value="templates" className="px-3 py-1.5 text-xs sm:text-sm">Templates</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-0 w-full min-w-0 overflow-x-auto">
            <BotOverviewTab
              sessionId={sessionId}
              botPath={botPath}
              botName={botName}
              onRagStatusChange={onRagStatusChange}
            />
          </TabsContent>
          <TabsContent value="cron" className="mt-0 w-full min-w-0 overflow-x-auto">
            <BotJobsTab sessionId={sessionId} botPath={botPath} templateJob={jobInsertData} />
          </TabsContent>
          <TabsContent value="skills" className="mt-0 w-full min-w-0 overflow-x-auto">
            <BotSkillsTab
              sessionId={sessionId}
              botPath={botPath}
              templateContent={skillInsertContent}
              templateContentAppend={skillInsertContentAppend}
              onTemplateContentAppendConsumed={() => setSkillInsertContentAppend(null)}
            />
          </TabsContent>
          <TabsContent value="web" className="mt-0 w-full min-w-0 overflow-x-auto">
            <BotWebTab sessionId={sessionId} botPath={botPath} onInsertSkill={handleInsertWebSkill} />
          </TabsContent>
          <TabsContent value="playground" className="mt-0 w-full min-w-0 overflow-x-auto">
            <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <AgentFilesystemTree sessionId={sessionId} rootPath={`${botPath}/playground`} />
            </div>
          </TabsContent>
          <TabsContent value="memory" className="mt-0 w-full min-w-0 overflow-x-auto">
            <BotMemoryTab sessionId={sessionId} botPath={botPath} />
          </TabsContent>
          <TabsContent value="states" className="mt-0 w-full min-w-0 overflow-x-auto">
            <BotStatesTab sessionId={sessionId} botPath={botPath} />
          </TabsContent>
          <TabsContent value="env" className="mt-0 w-full min-w-0 overflow-x-auto">
            <BotEnvTab sessionId={sessionId} botPath={botPath} />
          </TabsContent>
          <TabsContent value="files" className="mt-0 w-full min-w-0 overflow-x-auto">
            <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <AgentFilesystemTree sessionId={sessionId} rootPath={botPath} />
            </div>
          </TabsContent>
          <TabsContent value="contacts" className="mt-0 w-full min-w-0 overflow-x-auto">
            <BotContactsTab sessionId={sessionId} botPath={botPath} />
          </TabsContent>
          <TabsContent value="templates" className="mt-0 w-full min-w-0 overflow-x-auto">
            <BotTemplatesTab
              sessionId={sessionId}
              botPath={botPath}
              onInsertSkill={handleTemplateSkillInsert}
              onInsertJob={handleTemplateJobInsert}
              onInsertPlayground={handleTemplatePlaygroundInsert}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function AiBotsPageContent() {
  const defaultHost = getDefaultSshHost();
  const { sessionId, setConnection } = useServerConnectionStore();
  const isConnected = hasValidSessionId(sessionId);
  const [tier, setTier] = useState<"basic" | "advanced" | "premium">("basic");
  const [ragEnabled, setRagEnabled] = useState(false);
  const [defaultHostAvailable, setDefaultHostAvailable] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const autoConnectAttempted = useRef(false);

  const tierPath = `${AGENTS_BASE}/${tier}`;

  // Check if default SSH host (from .env) is in SSH config
  useEffect(() => {
    if (!defaultHost) {
      setDefaultHostAvailable(false);
      return;
    }
    let cancelled = false;
    fetch(getServerApiUrl("/api/server/ssh-config"))
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.hosts?.some((h: { host: string }) => h.host === defaultHost)) {
          setDefaultHostAvailable(true);
        }
      })
      .catch(() => {
        if (!cancelled) setDefaultHostAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [defaultHost]);

  // Auto-connect to default host when on AI Bots page and not connected
  useEffect(() => {
    if (!defaultHost || !isTauri || !defaultHostAvailable || isConnected || connecting || autoConnectAttempted.current) return;
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
  }, [defaultHost, defaultHostAvailable, isConnected, connecting, setConnection]);

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
      if (res.ok && data.sessionId) {
        setConnection(data.sessionId, defaultHost);
        toast.success(`Connected to ${defaultHost}`);
      } else {
        toast.error(data?.error ?? "Connection failed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }, [defaultHost, isConnected, connecting, setConnection]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 w-full max-w-[1600px] mx-auto min-w-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Bots</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Agent file systems: Basic, Advanced, Premium. Each folder shows cron, memory, skills, and states.
        </p>
      </div>

      {!isConnected || !sessionId ? (
        <Card className="border-border/50 bg-card-tint-1">
          <CardContent className="py-8 flex flex-col items-center justify-center gap-4 text-center">
            {defaultHost && defaultHostAvailable ? (
              <>
                <p className="text-muted-foreground">
                  Connect to your server to view and manage AI bots.
                </p>
                <Button
                  size="sm"
                  disabled={connecting}
                  onClick={() => void handleConnect()}
                  className="gap-2"
                  aria-label={`Connect to ${defaultHost}`}
                >
                  {connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <>
                      <Server className="h-4 w-4" aria-hidden />
                      Connect to {defaultHost}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">
                Connect to a server on the Server page to view agent files.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4 w-full min-w-0">
            <Tabs value={tier} onValueChange={(v) => setTier(v as "basic" | "advanced" | "premium")} className="w-full min-w-0">
              <TabsList className="mb-2 w-full">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="premium">Premium</TabsTrigger>
              </TabsList>

              <TierSectionTabs
                sessionId={sessionId}
                botPath={tierPath}
                botName={tier}
                onRagStatusChange={setRagEnabled}
              />
            </Tabs>
          </div>
          <ServerAgentFAB sessionId={sessionId} />
        </>
      )}
    </div>
  );
}
