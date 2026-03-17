"use client";

/** Project Project Tab component. */
import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, FileText, FolderOpen, FolderInput, RefreshCw, Play, Square, FolderGit2, Bot, Folder, MonitorUp, MessageSquare } from "lucide-react";
import { listProjectFiles, readProjectFileOrEmpty, updateProject, writeProjectFile, type FileEntry } from "@/lib/api-projects";
import { isTauri } from "@/lib/tauri";
import { useRunStore } from "@/store/run-store";
import type { Project } from "@/types/project";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/molecules/Display/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PROJECT_DIR } from "@/lib/cursor-paths";
import { TerminalSlot } from "@/components/molecules/Display/TerminalSlot";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProjectFilesTab } from "@/components/organisms/Tabs/ProjectFilesTab";
import { ProjectAgentsSection } from "@/components/organisms/Tabs/ProjectAgentsSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PromptRecordsPageContent } from "@/components/organisms/PromptRecordsPageContent";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUpdatedAt(updatedAt: string): string {
  try {
    const d = new Date(updatedAt);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return "—";
  }
}

/** Extract port from a localhost URL (e.g. http://localhost:3000 -> 3000). */
function getPortFromLocalUrl(url: string): number | null {
  const m = url.match(/:(\d+)(?:\/|$)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Rebuild app and put on Desktop — run npm run build:desktop (Tauri only). */
function RebuildDesktopSection() {
  const runBuildDesktop = useRunStore((s) => s.runBuildDesktop);
  const isTauriEnv = useRunStore((s) => s.isTauriEnv);
  const [running, setRunning] = useState(false);

  const handleRebuild = useCallback(async () => {
    setRunning(true);
    try {
      const ok = await runBuildDesktop();
      if (ok) {
        toast.success("Terminal opened; build running. App will be copied to Desktop when done.");
      } else {
        toast.error("Failed to start build (see error).");
      }
    } finally {
      setRunning(false);
    }
  }, [runBuildDesktop]);

  if (isTauriEnv !== true) return null;

  return (
    <div className="rounded-2xl surface-card border border-border/50 overflow-hidden bg-slate-500/[0.06]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-7 rounded-lg bg-slate-500/10">
            <MonitorUp className="size-3.5 text-slate-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground tracking-tight">Rebuild and put on Desktop</h3>
            <p className="text-[10px] text-muted-foreground normal-case">
              Open Terminal and run <code className="rounded bg-muted px-0.5">npm run build:desktop</code> (run this app via <code className="rounded bg-muted px-0.5">tauri dev</code> so the project root is correct).
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          disabled={running}
          onClick={handleRebuild}
          title="Open Terminal and run build:desktop"
        >
          {running ? <Loader2 className="size-3.5 animate-spin" /> : <MonitorUp className="size-3.5" />}
          Rebuild and put on Desktop
        </Button>
      </div>
    </div>
  );
}

const ADR_DIR = ".cursor/adr";
const RULES_DIR = ".cursor/rules";

interface ProjectProjectTabProps {
  project: Project;
  projectId: string;
  docsRefreshKey?: number;
  /** Called after project is updated (e.g. run port saved) so parent can refetch. */
  onProjectUpdate?: () => void;
}

export function ProjectProjectTab({ project, projectId, docsRefreshKey, onProjectUpdate }: ProjectProjectTabProps) {
  const runNpmScript = useRunStore((s) => s.runNpmScript);
  const runNpmScriptInExternalTerminal = useRunStore((s) => s.runNpmScriptInExternalTerminal);
  const stopRun = useRunStore((s) => s.stopRun);
  const runningRuns = useRunStore((s) => s.runningRuns);
  const [adrEntries, setAdrEntries] = useState<FileEntry[]>([]);
  const [rulesEntries, setRulesEntries] = useState<FileEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scripts, setScripts] = useState<Record<string, string>>({});
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [savingPort, setSavingPort] = useState(false);
  const [folderRefreshKey, setFolderRefreshKey] = useState(0);
  const [initializeRulesLoading, setInitializeRulesLoading] = useState(false);
  const cancelledRef = useRef(false);
  const scriptsCancelledRef = useRef(false);

  /** Inner tabs: All (accordion) or a single section (Rules, ADR, Prompts, etc.). */
  const INNER_TAB_VALUES = ["all", "rules", "adr", "prompts", "project-files", "run", "agents"] as const;
  const [innerTab, setInnerTab] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    const h = window.location.hash.slice(1).toLowerCase();
    return INNER_TAB_VALUES.includes(h as (typeof INNER_TAB_VALUES)[number]) ? h : "all";
  });

  /** Accordion section open by default or from hash (#rules, #project-files, #run, etc.) when inner tab is "all". */
  const ACCORDION_VALUES = ["rules", "project-files", "run", "adr", "agents"] as const;
  const [openSection, setOpenSection] = useState<string>(() => {
    if (typeof window === "undefined") return "rules";
    const h = window.location.hash.slice(1).toLowerCase();
    return ACCORDION_VALUES.includes(h as (typeof ACCORDION_VALUES)[number]) ? h : "rules";
  });

  useEffect(() => {
    const syncFromHash = () => {
      const h = window.location.hash.slice(1).toLowerCase();
      if (INNER_TAB_VALUES.includes(h as (typeof INNER_TAB_VALUES)[number])) {
        setInnerTab(h);
      } else if (ACCORDION_VALUES.includes(h as (typeof ACCORDION_VALUES)[number])) {
        setOpenSection(h);
      }
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  // Sync inner tab / accordion section to URL hash so the current view is shareable.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = innerTab !== "all" ? innerTab : openSection === "run" ? "" : openSection;
    const url = window.location.pathname + window.location.search + (hash ? `#${hash}` : "");
    window.history.replaceState(null, "", url);
  }, [innerTab, openSection]);

  const loadAdrAndRules = useCallback(async () => {
    if (!project.repoPath) return;
    cancelledRef.current = false;
    try {
      const [adrList, rulesList] = await Promise.all([
        listProjectFiles(projectId, ADR_DIR, project.repoPath),
        listProjectFiles(projectId, RULES_DIR, project.repoPath),
      ]);
      if (cancelledRef.current) return;
      setAdrEntries((adrList ?? []).filter((e) => !e.isDirectory));
      setRulesEntries((rulesList ?? []).filter((e) => !e.isDirectory));
    } catch {
      if (!cancelledRef.current) {
        setAdrEntries([]);
        setRulesEntries([]);
      }
    }
  }, [projectId, project.repoPath]);

  const handleInitializeRules = useCallback(async () => {
    if (!project.repoPath) {
      toast.error("Project has no repo path.");
      return;
    }
    setInitializeRulesLoading(true);
    try {
      const res = await fetch("/api/data/cursor-rules-template");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to load rules template");
        return;
      }
      const data = await res.json();
      const rules = Array.isArray(data.rules) ? data.rules : [];
      if (rules.length === 0) {
        toast.info("No rules to copy.");
        return;
      }
      const base = RULES_DIR;
      for (const rule of rules as { name: string; content: string }[]) {
        const relativePath = base + (base.endsWith("/") ? "" : "/") + rule.name;
        await writeProjectFile(projectId, relativePath, rule.content, project.repoPath);
      }
      await loadAdrAndRules();
      toast.success(`Initialized ${rules.length} rule(s) in ${RULES_DIR}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to initialize rules");
    } finally {
      setInitializeRulesLoading(false);
    }
  }, [projectId, project.repoPath, loadAdrAndRules]);

  useEffect(() => {
    cancelledRef.current = false;
    loadAdrAndRules();
    return () => {
      cancelledRef.current = true;
    };
  }, [loadAdrAndRules, docsRefreshKey, folderRefreshKey]);

  const loadScripts = useCallback((): Promise<void> => {
    if (!project.repoPath) {
      setScripts({});
      return Promise.resolve();
    }
    scriptsCancelledRef.current = false;
    setLoadingScripts(true);
    return readProjectFileOrEmpty(projectId, "package.json", project.repoPath)
      .then((raw) => {
        if (scriptsCancelledRef.current) return;
        try {
          const pkg = raw?.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {};
          const s = pkg.scripts as Record<string, string> | undefined;
          setScripts(s && typeof s === "object" ? s : {});
        } catch {
          setScripts({});
        }
      })
      .catch((err) => {
        if (!scriptsCancelledRef.current) setScripts({});
        throw err;
      })
      .finally(() => {
        if (!scriptsCancelledRef.current) setLoadingScripts(false);
      });
  }, [projectId, project.repoPath]);

  useEffect(() => {
    if (!project.repoPath) {
      setScripts({});
      return;
    }
    scriptsCancelledRef.current = false;
    loadScripts();
    return () => {
      scriptsCancelledRef.current = true;
    };
  }, [loadScripts, project.repoPath]);

  if (!project.repoPath) {
    return (
      <EmptyState
        icon={<FolderOpen className="size-6 text-muted-foreground" />}
        title="No repo path"
        description={`Set a repository path for this project to load project info from ${PROJECT_DIR}.`}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={innerTab} onValueChange={setInnerTab} className="w-full">
        <TabsList className="flex flex-wrap gap-1 bg-muted/50 border border-border/40 rounded-lg p-1 mb-4">
          <TabsTrigger value="all" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <FolderOpen className="size-3.5" />
            All
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <Folder className="size-3.5" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="adr" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <FileText className="size-3.5" />
            ADR
          </TabsTrigger>
          <TabsTrigger value="prompts" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <MessageSquare className="size-3.5" />
            Prompts
          </TabsTrigger>
          <TabsTrigger value="project-files" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <FolderGit2 className="size-3.5" />
            Project Files
          </TabsTrigger>
          <TabsTrigger value="run" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <Play className="size-3.5" />
            Run
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <Bot className="size-3.5" />
            Agents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            <div className="space-y-2 pr-4">
              <Accordion type="single" collapsible value={openSection} onValueChange={setOpenSection} className="w-full space-y-2">
            {/* Rules — first */}
            <AccordionItem value="rules" className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden data-[state=open]:border-teal-500/30">
              <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-muted/20 [&[data-state=open]]:border-b [&[data-state=open]]:border-border/40">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-teal-500" />
                  <h3 className="text-sm font-semibold">Rules</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-2">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <p className="text-xs text-muted-foreground">
                Cursor rules and conventions in <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{RULES_DIR}</code>.
              </p>
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs gap-1.5"
                disabled={initializeRulesLoading || !project.repoPath}
                onClick={() => void handleInitializeRules()}
                title="Copy useful Cursor rules from this app (or built-in) into the project's .cursor/rules"
              >
                {initializeRulesLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FolderInput className="h-3.5 w-3.5" />
                )}
                Initialize
              </Button>
            </div>
            {rulesEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground">No files in this folder.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs w-20">Size</TableHead>
                    <TableHead className="text-xs w-24">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rulesEntries.map((e) => (
                    <TableRow key={e.name}>
                      <TableCell className="font-mono text-xs">{e.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatSize(e.size)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatUpdatedAt(e.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
              </AccordionContent>
            </AccordionItem>

            {/* Project Files — .cursor directory browser */}
            <AccordionItem
              value="project-files" className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden data-[state=open]:border-rose-500/30">
              <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-muted/20 [&[data-state=open]]:border-b [&[data-state=open]]:border-border/40">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-rose-500" />
                  <h3 className="text-sm font-semibold">Project Files</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-2">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={() => setFolderRefreshKey((k) => k + 1)} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
              <ProjectFilesTab project={project} projectId={projectId} />
            </div>
              </AccordionContent>
            </AccordionItem>

            {/* Run section: scripts from package.json + Play + terminal output */}
            <AccordionItem value="run" className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden data-[state=open]:border-sky-500/30">
              <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-muted/20 [&[data-state=open]]:border-b [&[data-state=open]]:border-border/40">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-sky-500" />
                  <h3 className="text-sm font-semibold">Run</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-2">
            <div className="flex items-start justify-between gap-3 mb-4">
              <p className="text-xs text-muted-foreground flex-1 min-w-0">
                Run npm scripts from the project directory. On macOS, each script opens in Terminal.app; on other platforms output appears below (localhost URL becomes &quot;Open app&quot;).
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1.5 text-xs"
                      disabled={loadingScripts || !project.repoPath}
                      onClick={() => {
                        loadScripts().then(() => toast.success("Scripts refreshed")).catch(() => toast.error("Failed to load scripts"));
                      }}
                      aria-label="Reload scripts from package.json"
                    >
                      <RefreshCw className={cn("size-3.5", loadingScripts && "animate-spin")} />
                      Refresh
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Reload scripts from package.json
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {loadingScripts ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-xs">Loading package.json…</span>
              </div>
            ) : Object.keys(scripts).length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 rounded-lg border border-border/40 bg-muted/10 px-4">
                No package.json or no scripts found. Add a package.json with a <code className="rounded bg-muted px-1 font-mono">scripts</code> section to run commands from here.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(scripts).map(([name, cmd]) => {
                    const canRun = isTauri && project.repoPath;
                    return (
                      <TooltipProvider key={name}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                                disabled={!canRun}
                                onClick={async () => {
                                  if (!canRun || !project.repoPath) return;
                                  try {
                                    const opened = await runNpmScriptInExternalTerminal(project.repoPath, name);
                                    if (opened) {
                                      toast.success("Opened in Terminal.");
                                      return;
                                    }
                                    const err = useRunStore.getState().error ?? "";
                                    if (err.includes("only supported on macOS")) {
                                      const runId = await runNpmScript(project.repoPath, name);
                                      if (runId) {
                                        setLastRunId(runId);
                                        toast.success("Running. Output below.");
                                      }
                                    } else {
                                      toast.error(err || "Failed to open terminal");
                                    }
                                  } catch (e) {
                                    toast.error(e instanceof Error ? e.message : "Failed to start");
                                  }
                                }}
                              >
                                <Play className="size-3" />
                                {name}
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {canRun ? `npm run ${name} (opens Terminal on Mac)` : "Run scripts in Tauri app"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
                {!isTauri && Object.keys(scripts).length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Run scripts from the Tauri desktop app to see output here.
                  </p>
                )}
                {lastRunId && (() => {
                  const run = runningRuns.find((r) => r.runId === lastRunId);
                  if (!run) return null;
                  const isRunning = run.status === "running";
                  const portFromUrl = run.localUrl ? getPortFromLocalUrl(run.localUrl) : null;
                  const canSavePort =
                    portFromUrl != null &&
                    (project.runPort == null || project.runPort !== portFromUrl);
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-medium text-muted-foreground">{run.label}</span>
                        <div className="flex items-center gap-2">
                          {canSavePort && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs"
                              disabled={savingPort}
                              onClick={async () => {
                                if (portFromUrl == null) return;
                                setSavingPort(true);
                                try {
                                  await updateProject(projectId, { runPort: portFromUrl });
                                  onProjectUpdate?.();
                                  toast.success("Run port saved. Use View Running Project in the top bar.");
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : "Failed to save port");
                                } finally {
                                  setSavingPort(false);
                                }
                              }}
                            >
                              {savingPort ? <Loader2 className="size-3 animate-spin" /> : null}
                              Use as project URL
                            </Button>
                          )}
                          {isRunning && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => stopRun(lastRunId)}
                            >
                              <Square className="size-3" />
                              Stop
                            </Button>
                          )}
                        </div>
                      </div>
                      <TerminalSlot
                        run={{
                          runId: run.runId,
                          label: run.label,
                          logLines: run.logLines,
                          status: run.status,
                          startedAt: run.startedAt,
                          doneAt: run.doneAt,
                          localUrl: run.localUrl,
                        }}
                        slotIndex={0}
                        heightClass="h-[240px]"
                      />
                    </div>
                  );
                })()}
              </div>
            )}
              </AccordionContent>
            </AccordionItem>

            {/* ADR — Architecture decision records */}
            <AccordionItem value="adr" className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden data-[state=open]:border-violet-500/30">
              <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-muted/20 [&[data-state=open]]:border-b [&[data-state=open]]:border-border/40">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-500" />
                  <h3 className="text-sm font-semibold">ADR</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-2">
            <p className="text-xs text-muted-foreground mb-3">
              Architecture decision records in <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{ADR_DIR}</code>.
            </p>
            {adrEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground">No files in this folder.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs w-20">Size</TableHead>
                    <TableHead className="text-xs w-24">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adrEntries.map((e) => (
                    <TableRow key={e.name}>
                      <TableCell className="font-mono text-xs">{e.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatSize(e.size)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatUpdatedAt(e.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
              </AccordionContent>
            </AccordionItem>

            {/* Agents */}
            <AccordionItem value="agents" className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden data-[state=open]:border-cyan-500/30">
              <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-muted/20 [&[data-state=open]]:border-b [&[data-state=open]]:border-border/40">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-cyan-500" />
                  <h3 className="text-sm font-semibold">Agents</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-2">
            <ProjectAgentsSection project={project} projectId={projectId} />
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </div>
      </ScrollArea>
        </TabsContent>

        <TabsContent value="rules" className="mt-0">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden data-[state=open]:border-teal-500/30 p-5 pr-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <p className="text-xs text-muted-foreground">
                  Cursor rules and conventions in <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{RULES_DIR}</code>.
                </p>
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  disabled={initializeRulesLoading || !project.repoPath}
                  onClick={() => void handleInitializeRules()}
                  title="Copy useful Cursor rules from this app (or built-in) into the project's .cursor/rules"
                >
                  {initializeRulesLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FolderInput className="h-3.5 w-3.5" />
                  )}
                  Initialize
                </Button>
              </div>
              {rulesEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground">No files in this folder.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs w-20">Size</TableHead>
                      <TableHead className="text-xs w-24">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rulesEntries.map((e) => (
                      <TableRow key={e.name}>
                        <TableCell className="font-mono text-xs">{e.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatSize(e.size)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatUpdatedAt(e.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="adr" className="mt-0">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden p-5 pr-4">
              <p className="text-xs text-muted-foreground mb-3">
                Architecture decision records in <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{ADR_DIR}</code>.
              </p>
              {adrEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground">No files in this folder.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs w-20">Size</TableHead>
                      <TableHead className="text-xs w-24">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adrEntries.map((e) => (
                      <TableRow key={e.name}>
                        <TableCell className="font-mono text-xs">{e.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatSize(e.size)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatUpdatedAt(e.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="prompts" className="mt-0">
          <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 md:p-6 min-h-0 min-w-0">
            <PromptRecordsPageContent projectId={projectId} />
          </div>
        </TabsContent>

        <TabsContent value="project-files" className="mt-0">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden p-5 pr-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setFolderRefreshKey((k) => k + 1)} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </Button>
                </div>
                <ProjectFilesTab project={project} projectId={projectId} />
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="run" className="mt-0">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden p-5 pr-4 space-y-3">
              <div className="flex items-start justify-between gap-3 mb-4">
                <p className="text-xs text-muted-foreground flex-1 min-w-0">
                  Run npm scripts from the project directory. On macOS, each script opens in Terminal.app; on other platforms output appears below (localhost URL becomes &quot;Open app&quot;).
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 gap-1.5 text-xs"
                        disabled={loadingScripts || !project.repoPath}
                        onClick={() => {
                          loadScripts().then(() => toast.success("Scripts refreshed")).catch(() => toast.error("Failed to load scripts"));
                        }}
                        aria-label="Reload scripts from package.json"
                      >
                        <RefreshCw className={cn("size-3.5", loadingScripts && "animate-spin")} />
                        Refresh
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Reload scripts from package.json
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {loadingScripts ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-xs">Loading package.json…</span>
                </div>
              ) : Object.keys(scripts).length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 rounded-lg border border-border/40 bg-muted/10 px-4">
                  No package.json or no scripts found. Add a package.json with a <code className="rounded bg-muted px-1 font-mono">scripts</code> section to run commands from here.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(scripts).map(([name]) => {
                      const canRun = isTauri && project.repoPath;
                      return (
                        <TooltipProvider key={name}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 text-xs"
                                  disabled={!canRun}
                                  onClick={async () => {
                                    if (!canRun || !project.repoPath) return;
                                    try {
                                      const opened = await runNpmScriptInExternalTerminal(project.repoPath, name);
                                      if (opened) {
                                        toast.success("Opened in Terminal.");
                                        return;
                                      }
                                      const err = useRunStore.getState().error ?? "";
                                      if (err.includes("only supported on macOS")) {
                                        const runId = await runNpmScript(project.repoPath, name);
                                        if (runId) {
                                          setLastRunId(runId);
                                          toast.success("Running. Output below.");
                                        }
                                      } else {
                                        toast.error(err || "Failed to open terminal");
                                      }
                                    } catch (e) {
                                      toast.error(e instanceof Error ? e.message : "Failed to start");
                                    }
                                  }}
                                >
                                  <Play className="size-3" />
                                  {name}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {canRun ? `npm run ${name} (opens Terminal on Mac)` : "Run scripts in Tauri app"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                  {!isTauri && Object.keys(scripts).length > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Run scripts from the Tauri desktop app to see output here.
                    </p>
                  )}
                  {lastRunId && (() => {
                    const run = runningRuns.find((r) => r.runId === lastRunId);
                    if (!run) return null;
                    const isRunning = run.status === "running";
                    const portFromUrl = run.localUrl ? getPortFromLocalUrl(run.localUrl) : null;
                    const canSavePort =
                      portFromUrl != null &&
                      (project.runPort == null || project.runPort !== portFromUrl);
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-medium text-muted-foreground">{run.label}</span>
                          <div className="flex items-center gap-2">
                            {canSavePort && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                                disabled={savingPort}
                                onClick={async () => {
                                  if (portFromUrl == null) return;
                                  setSavingPort(true);
                                  try {
                                    await updateProject(projectId, { runPort: portFromUrl });
                                    onProjectUpdate?.();
                                    toast.success("Run port saved. Use View Running Project in the top bar.");
                                  } catch (e) {
                                    toast.error(e instanceof Error ? e.message : "Failed to save port");
                                  } finally {
                                    setSavingPort(false);
                                  }
                                }}
                              >
                                {savingPort ? <Loader2 className="size-3 animate-spin" /> : null}
                                Use as project URL
                              </Button>
                            )}
                            {isRunning && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                                onClick={() => stopRun(lastRunId)}
                              >
                                <Square className="size-3" />
                                Stop
                              </Button>
                            )}
                          </div>
                        </div>
                        <TerminalSlot
                          run={{
                            runId: run.runId,
                            label: run.label,
                            logLines: run.logLines,
                            status: run.status,
                            startedAt: run.startedAt,
                            doneAt: run.doneAt,
                            localUrl: run.localUrl,
                          }}
                          slotIndex={0}
                          heightClass="h-[240px]"
                        />
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="agents" className="mt-0">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden p-5 pr-4">
              <ProjectAgentsSection project={project} projectId={projectId} />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
      <RebuildDesktopSection />
    </div>
  );
}
