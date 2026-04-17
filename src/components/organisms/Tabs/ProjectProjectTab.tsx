"use client";

/** Project Project Tab component. */
import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, FileText, FolderOpen, FolderInput, RefreshCw, Play, Square, FolderGit2, Bot, Folder, MonitorUp, MessageSquare, Hammer, Trash2, Plug, ListChecks } from "lucide-react";
import { listProjectFiles, readProjectFile, readProjectFileOrEmpty, updateProject, writeProjectFile, deleteProjectPath, type FileEntry } from "@/lib/api-projects";
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
import { getDefaultProjectFilesPath } from "@/lib/project-files-default-path";
import { TerminalSlot } from "@/components/molecules/Display/TerminalSlot";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProjectFilesTab } from "@/components/organisms/Tabs/ProjectFilesTab";
import { ProjectAgentsSection } from "@/components/organisms/Tabs/ProjectAgentsSection";
import { ProjectMcpSection } from "@/components/organisms/Tabs/ProjectMcpSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PromptRecordsPageContent } from "@/components/organisms/PromptRecordsPageContent";

type InitializeAllChecklistItem = {
  categorySlug: string;
  label: string;
  summary: string;
  files: string[];
};

type InitializeAllManifest = {
  version: number;
  title: string;
  description?: string;
  checklist: InitializeAllChecklistItem[];
};

type CursorRulesTemplateResponse = {
  rules?: { name: string; content: string }[];
  rulesByCategory?: Record<string, { name: string; content: string }[]>;
  initializeAllManifest?: InitializeAllManifest | null;
  error?: string;
};

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

const ADR_DIR = ".cursor/adr";
const RULES_DIR = ".cursor/rules";

/** Rule categories: slug (folder name) and display label. Order matches Rules tab. */
const RULES_CATEGORIES = [
  { slug: "design", label: "Design" },
  { slug: "architecture", label: "Architecture" },
  { slug: "does", label: "Does" },
  { slug: "donts", label: "Donts" },
  { slug: "coding", label: "Coding" },
  { slug: "testing", label: "Testing" },
  { slug: "security", label: "Security" },
  { slug: "naming", label: "Naming" },
  { slug: "api", label: "API" },
  { slug: "general", label: "General" },
] as const;

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
  const runBuildDesktop = useRunStore((s) => s.runBuildDesktop);
  const runCopyBuildToDesktop = useRunStore((s) => s.runCopyBuildToDesktop);
  const stopRun = useRunStore((s) => s.stopRun);
  const runningRuns = useRunStore((s) => s.runningRuns);
  const [adrEntries, setAdrEntries] = useState<FileEntry[]>([]);
  const [rulesEntriesByCategory, setRulesEntriesByCategory] = useState<Record<string, FileEntry[]>>({});
  const [rulesCategoryTab, setRulesCategoryTab] = useState<string>("design");
  const [initializeRulesCategoryLoading, setInitializeRulesCategoryLoading] = useState<string | null>(null);
  const [rulesTemplatePayload, setRulesTemplatePayload] = useState<CursorRulesTemplateResponse | null>(null);
  const [rulesTemplateLoading, setRulesTemplateLoading] = useState(false);
  const [initializeAllLoading, setInitializeAllLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scripts, setScripts] = useState<Record<string, string>>({});
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [savingPort, setSavingPort] = useState(false);
  const [folderRefreshKey, setFolderRefreshKey] = useState(0);
  const [projectFilesActionLoading, setProjectFilesActionLoading] = useState<"rebuild" | "desktop" | "deleteAll" | null>(null);
  const [projectFilesCurrentPath, setProjectFilesCurrentPath] = useState(getDefaultProjectFilesPath());
  const [projectFilesEntries, setProjectFilesEntries] = useState<FileEntry[]>([]);
  const [rulePreview, setRulePreview] = useState<{ name: string; content: string } | null>(null);
  const [rulePreviewLoading, setRulePreviewLoading] = useState(false);
  const cancelledRef = useRef(false);
  const scriptsCancelledRef = useRef(false);

  /** Inner tabs: Project Files first, then Run, Prompts, Rules, MCP, ADR, Agents. */
  const INNER_TAB_VALUES = ["project-files", "run", "prompts", "rules", "mcp", "adr", "agents"] as const;
  const [innerTab, setInnerTab] = useState<string>(() => {
    if (typeof window === "undefined") return "project-files";
    const h = window.location.hash.slice(1).toLowerCase();
    return INNER_TAB_VALUES.includes(h as (typeof INNER_TAB_VALUES)[number]) ? h : "project-files";
  });

  useEffect(() => {
    const syncFromHash = () => {
      const h = window.location.hash.slice(1).toLowerCase();
      if (INNER_TAB_VALUES.includes(h as (typeof INNER_TAB_VALUES)[number])) {
        setInnerTab(h);
      }
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  // Sync inner tab to URL hash so the current view is shareable.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = window.location.pathname + window.location.search + (innerTab ? `#${innerTab}` : "");
    window.history.replaceState(null, "", url);
  }, [innerTab]);

  const loadAdrAndRules = useCallback(async () => {
    if (!project.repoPath) return;
    cancelledRef.current = false;
    try {
      const adrList = await listProjectFiles(projectId, ADR_DIR, project.repoPath);
      if (cancelledRef.current) return;
      setAdrEntries((adrList ?? []).filter((e) => !e.isDirectory));
    } catch {
      if (!cancelledRef.current) setAdrEntries([]);
    }
  }, [projectId, project.repoPath]);

  const loadRulesForCategory = useCallback(
    async (categorySlug: string) => {
      if (!project.repoPath) return;
      const listPath = categorySlug === "general" ? RULES_DIR : `${RULES_DIR}/${categorySlug}`;
      try {
        const list = await listProjectFiles(projectId, listPath, project.repoPath);
        const files = (list ?? []).filter((e) => !e.isDirectory);
        setRulesEntriesByCategory((prev) => ({ ...prev, [categorySlug]: files }));
      } catch {
        setRulesEntriesByCategory((prev) => ({ ...prev, [categorySlug]: [] }));
      }
    },
    [projectId, project.repoPath]
  );

  const handleInitializeRulesForCategory = useCallback(
    async (categorySlug: string) => {
      if (!project.repoPath) {
        toast.error("Project has no repo path.");
        return;
      }
      setInitializeRulesCategoryLoading(categorySlug);
      try {
        const res = await fetch("/api/data/cursor-rules-template");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error ?? "Failed to load rules template");
          return;
        }
        const data = await res.json();
        const rulesByCategory = (data.rulesByCategory ?? {}) as Record<string, { name: string; content: string }[]>;
        const rules = rulesByCategory[categorySlug] ?? [];
        if (rules.length === 0) {
          toast.info(`No template rules for category "${categorySlug}". Add JSON files in data/rules/${categorySlug === "general" ? "" : categorySlug}.`);
          return;
        }
        const base = RULES_DIR.endsWith("/") ? RULES_DIR : RULES_DIR + "/";
        for (const rule of rules) {
          await writeProjectFile(projectId, base + rule.name, rule.content, project.repoPath);
        }
        await loadRulesForCategory(categorySlug);
        toast.success(`Initialized ${rules.length} rule(s) for ${RULES_CATEGORIES.find((c) => c.slug === categorySlug)?.label ?? categorySlug}.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to initialize rules");
      } finally {
        setInitializeRulesCategoryLoading(null);
      }
    },
    [projectId, project.repoPath, loadRulesForCategory]
  );

  const handleInitializeAllEssential = useCallback(async () => {
    if (!project.repoPath) {
      toast.error("Project has no repo path.");
      return;
    }
    setInitializeAllLoading(true);
    try {
      let payload = rulesTemplatePayload;
      if (!payload?.rules?.length) {
        const res = await fetch("/api/data/cursor-rules-template");
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as CursorRulesTemplateResponse;
          toast.error(data.error ?? "Failed to load rules template");
          return;
        }
        payload = (await res.json()) as CursorRulesTemplateResponse;
        setRulesTemplatePayload(payload);
      }
      const manifest = payload?.initializeAllManifest;
      const checklist = manifest?.checklist ?? [];
      if (checklist.length === 0) {
        toast.error("No essential checklist. Add data/rules/initialize-all-manifest.json.");
        return;
      }
      const rules = payload.rules ?? [];
      const byName = new Map(rules.map((r) => [r.name, r] as const));
      const base = RULES_DIR.endsWith("/") ? RULES_DIR : `${RULES_DIR}/`;
      const missing: string[] = [];
      let written = 0;

      for (const row of checklist) {
        for (const file of row.files) {
          const rule = byName.get(file);
          if (!rule) {
            missing.push(file);
            continue;
          }
          await writeProjectFile(projectId, base + rule.name, rule.content, project.repoPath);
          written += 1;
        }
      }

      await Promise.all(RULES_CATEGORIES.map((c) => loadRulesForCategory(c.slug)));

      if (missing.length > 0) {
        toast.error(`Some template files were missing: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}`);
      } else {
        toast.success(`Initialized ${written} essential rule file(s) across all categories.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to initialize all rules");
    } finally {
      setInitializeAllLoading(false);
    }
  }, [projectId, project.repoPath, loadRulesForCategory, rulesTemplatePayload]);

  const handleOpenRulePreview = useCallback(
    async (entry: FileEntry, categorySlug: string) => {
      if (entry.isDirectory || !project.repoPath) return;
      const relativePath = categorySlug === "general" ? `${RULES_DIR}/${entry.name}` : `${RULES_DIR}/${categorySlug}/${entry.name}`;
      setRulePreview({ name: entry.name, content: "" });
      setRulePreviewLoading(true);
      try {
        const raw = await readProjectFile(projectId, relativePath, project.repoPath);
        let content: string;
        try {
          const parsed = JSON.parse(raw) as unknown;
          content = JSON.stringify(parsed, null, 2);
        } catch {
          content = raw;
        }
        setRulePreview({ name: entry.name, content });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to read rule");
        setRulePreview(null);
      } finally {
        setRulePreviewLoading(false);
      }
    },
    [projectId, project.repoPath]
  );

  useEffect(() => {
    cancelledRef.current = false;
    loadAdrAndRules();
    return () => {
      cancelledRef.current = true;
    };
  }, [loadAdrAndRules, docsRefreshKey, folderRefreshKey]);

  useEffect(() => {
    if (project.repoPath && innerTab === "rules") {
      loadRulesForCategory(rulesCategoryTab);
    }
  }, [project.repoPath, innerTab, rulesCategoryTab, loadRulesForCategory, docsRefreshKey, folderRefreshKey]);

  useEffect(() => {
    if (!project.repoPath || innerTab !== "rules") return;
    let cancelled = false;
    setRulesTemplateLoading(true);
    fetch("/api/data/cursor-rules-template")
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as CursorRulesTemplateResponse;
      })
      .then((data) => {
        if (!cancelled && data) setRulesTemplatePayload(data);
      })
      .catch(() => {
        if (!cancelled) setRulesTemplatePayload(null);
      })
      .finally(() => {
        if (!cancelled) setRulesTemplateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [project.repoPath, innerTab, docsRefreshKey, folderRefreshKey]);

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
          <TabsTrigger value="project-files" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <FolderGit2 className="size-3.5" />
            Project Files
          </TabsTrigger>
          <TabsTrigger value="run" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <Play className="size-3.5" />
            Run
          </TabsTrigger>
          <TabsTrigger value="prompts" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <MessageSquare className="size-3.5" />
            Prompts
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <Folder className="size-3.5" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="mcp" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <Plug className="size-3.5" />
            MCP
          </TabsTrigger>
          <TabsTrigger value="adr" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <FileText className="size-3.5" />
            ADR
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <Bot className="size-3.5" />
            Agents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-0">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden data-[state=open]:border-teal-500/30 p-5 pr-4">
              <p className="text-xs text-muted-foreground mb-3">
                Cursor rules by category in <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{RULES_DIR}</code>. Use per-tab <strong className="text-foreground/90">Initialize</strong> for every JSON file in that category, or the button below to copy the curated essential set from <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">data/rules/initialize-all-manifest.json</code> in one go.
              </p>

              <div className="rounded-lg border border-border/50 bg-muted/20 p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2 min-w-0">
                  <ListChecks className="size-4 text-teal-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {rulesTemplateLoading
                        ? "Essential rules"
                        : (rulesTemplatePayload?.initializeAllManifest?.title ?? "Essential rules")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {rulesTemplateLoading
                        ? "Loading manifest…"
                        : (rulesTemplatePayload?.initializeAllManifest?.description ??
                          "One button copies the curated files for all categories into .cursor/rules.")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 text-xs gap-1.5 shrink-0"
                  disabled={
                    !!initializeRulesCategoryLoading ||
                    initializeAllLoading ||
                    !project.repoPath ||
                    rulesTemplateLoading ||
                    (rulesTemplatePayload?.initializeAllManifest?.checklist?.length ?? 0) === 0
                  }
                  onClick={() => void handleInitializeAllEssential()}
                  title="Copy curated essential rule files from data/rules into .cursor/rules"
                >
                  {initializeAllLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FolderInput className="h-3.5 w-3.5" />
                  )}
                  Initialize all (essential)
                </Button>
              </div>
              {!rulesTemplateLoading &&
              (rulesTemplatePayload?.initializeAllManifest?.checklist?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground mb-5 -mt-2">
                  Add <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">data/rules/initialize-all-manifest.json</code>{" "}
                  to enable the button.
                </p>
              ) : null}

              <Tabs value={rulesCategoryTab} onValueChange={setRulesCategoryTab} className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-1 p-1.5 bg-muted/50">
                  {RULES_CATEGORIES.map(({ slug, label }) => (
                    <TabsTrigger key={slug} value={slug} className="text-xs rounded-md px-2.5 py-1.5">
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {RULES_CATEGORIES.map(({ slug, label }) => (
                  <TabsContent key={slug} value={slug} className="mt-4 px-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <p className="text-xs text-muted-foreground">
                        {label} rules {slug === "general" ? "(root)" : `(${RULES_DIR}/${slug})`}.
                      </p>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        disabled={
                          !!initializeRulesCategoryLoading || initializeAllLoading || !project.repoPath
                        }
                        onClick={() => void handleInitializeRulesForCategory(slug)}
                        title={`Copy best-practice rules from data/rules/${slug === "general" ? "" : slug} into the project`}
                      >
                        {initializeRulesCategoryLoading === slug ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FolderInput className="h-3.5 w-3.5" />
                        )}
                        Initialize
                      </Button>
                    </div>
                    {!(slug in rulesEntriesByCategory) ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading…
                      </p>
                    ) : (rulesEntriesByCategory[slug] ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No files in this category. Use Initialize to add best-practice rules.</p>
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
                          {(rulesEntriesByCategory[slug] ?? []).map((e) => (
                            <TableRow
                              key={e.name}
                              className={cn(!e.isDirectory && "cursor-pointer hover:bg-muted/50")}
                              onClick={() => !e.isDirectory && void handleOpenRulePreview(e, slug)}
                            >
                              <TableCell className="font-mono text-xs">{e.name}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{formatSize(e.size)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{formatUpdatedAt(e.updatedAt)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
              {rulePreviewLoading && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading…
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="mcp" className="mt-0">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden p-5 pr-4">
              <ProjectMcpSection project={project} projectId={projectId} />
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
          <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden p-5 pr-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setFolderRefreshKey((k) => k + 1)} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </Button>
                <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={!isTauri || projectFilesActionLoading != null}
                      onClick={async () => {
                        setProjectFilesActionLoading("rebuild");
                        try {
                          const ok = await runBuildDesktop();
                          if (ok) toast.success("Rebuild started in Terminal.");
                          else toast.error(useRunStore.getState().error ?? "Failed to rebuild.");
                        } finally {
                          setProjectFilesActionLoading(null);
                        }
                      }}
                      title="Runs npm run build:desktop (desktop app only)"
                    >
                      {projectFilesActionLoading === "rebuild" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Hammer className="h-3.5 w-3.5" />
                      )}
                      Rebuild
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={projectFilesActionLoading != null || projectFilesEntries.filter((e) => e.name !== "." && e.name !== "..").length === 0}
                      onClick={async () => {
                        const toDelete = projectFilesEntries.filter(
                          (e) => e.name !== "." && e.name !== ".."
                        );
                        if (toDelete.length === 0) return;
                        setProjectFilesActionLoading("deleteAll");
                        try {
                          const base = projectFilesCurrentPath || "";
                          // Delete files first, then directories (recursive). Skip entries with empty or invalid path.
                          const filesFirst = [...toDelete].sort((a, b) =>
                            a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? 1 : -1
                          );
                          let deleted = 0;
                          for (const e of filesFirst) {
                            const name = (e.name ?? "").trim();
                            if (!name || name === "." || name === "..") continue;
                            const relPath = base ? `${base}/${name}` : name;
                            if (!relPath || relPath === "." || relPath === "..") continue;
                            await deleteProjectPath(
                              projectId,
                              relPath,
                              project.repoPath ?? undefined,
                              e.isDirectory
                            );
                            deleted += 1;
                          }
                          if (deleted > 0) toast.success(`Deleted ${deleted} item(s).`);
                          else toast.error("No valid paths to delete.");
                          setFolderRefreshKey((k) => k + 1);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed to delete some items");
                        } finally {
                          setProjectFilesActionLoading(null);
                        }
                      }}
                      title="Delete all files and folders in the current project files folder"
                    >
                      {projectFilesActionLoading === "deleteAll" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Delete all
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={!isTauri || projectFilesActionLoading != null}
                      onClick={async () => {
                        setProjectFilesActionLoading("desktop");
                        try {
                          const ok = await runCopyBuildToDesktop();
                          if (ok) toast.success("Copy-to-Desktop started in Terminal.");
                          else toast.error(useRunStore.getState().error ?? "Failed to put on Desktop.");
                        } finally {
                          setProjectFilesActionLoading(null);
                        }
                      }}
                      title="Runs script/tauri/copy-build-to-desktop.mjs (desktop app only)"
                    >
                      {projectFilesActionLoading === "desktop" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MonitorUp className="h-3.5 w-3.5" />
                      )}
                      Put on Desktop
                    </Button>
                </div>
              </div>
              <ProjectFilesTab
                project={project}
                projectId={projectId}
                onStateChange={(path, entries) => {
                  setProjectFilesCurrentPath(path);
                  setProjectFilesEntries(entries);
                }}
              />
            </div>
          </div>
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
                <>
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
                </>
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

      <Dialog open={!!rulePreview || rulePreviewLoading} onOpenChange={(open) => !open && setRulePreview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono truncate pr-8">{rulePreview?.name ?? "Rule"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0 rounded-md border bg-muted/10 p-4">
            {rulePreviewLoading && !rulePreview ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                {rulePreview?.content ?? ""}
              </pre>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
