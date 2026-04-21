"use client";

/**
 * Project detail page content: tabs (Overview, Worker, Git, Tickets, etc.) and prev/next navigation.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  AlertCircle,
  FolderGit2,
  ListTodo,
  Trash2,
  FolderOpen,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Hash,
  Flag,
  ClipboardList,
  Lightbulb,
  Activity,
  Bot,
  Play,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Project } from "@/types/project";
import { invoke, isTauri } from "@/lib/tauri";
import { getProjectResolved, deleteProject, listProjects, updateProject } from "@/lib/api-projects";
import { ProjectTicketsTab } from "@/components/organisms/Tabs/ProjectTicketsTab";
import { ProjectGitTab } from "@/components/organisms/Tabs/ProjectGitTab";
import { ProjectMilestonesTab } from "@/components/organisms/Tabs/ProjectMilestonesTab";
import { ProjectProjectTab } from "@/components/organisms/Tabs/ProjectProjectTab";
import { ProjectControlTab } from "@/components/organisms/Tabs/ProjectControlTab";
import { ProjectIdeasDocTab } from "@/components/organisms/Tabs/ProjectIdeasDocTab";
import { ProjectRunTab } from "@/components/organisms/Tabs/ProjectRunTab";
import { ProjectBottomRunTab } from "@/components/organisms/Tabs/ProjectBottomRunTab";
import { ErrorBoundary } from "@/components/organisms/ErrorBoundary";
import { cn } from "@/lib/utils";
import { MetadataBadge, CountBadge } from "@/components/molecules/Displays/DisplayPrimitives";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dialog as SharedDialog } from "@/components/molecules/FormsAndDialogs/Dialog";
import { ButtonGroup } from "@/components/molecules/ControlsAndButtons/ButtonGroup";
import { recordProjectVisit } from "@/lib/recent-projects";
import {
  getProjectDetailTabPreference,
  setProjectDetailTabPreference,
} from "@/lib/project-detail-tab-preference";
import { type AgentProvider, getAgentProvider, setAgentProvider } from "@/lib/agent-provider";
import { useSetPageTitle } from "@/context/page-title-context";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/molecules/Navigation/Breadcrumb";
import { debugIngest } from "@/lib/debug-ingest";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TAB_ROW_1 = [
  {
    value: "project",
    label: "Project",
    icon: FolderOpen,
    color: "text-sky-400",
    fill: "bg-sky-500/15",
    activeFill: "data-[state=active]:bg-sky-500/90",
    activeGlow: "data-[state=active]:shadow-sky-500/30",
  },
] as const;

const TAB_ROW_2 = [
  {
    value: "run",
    label: "Run",
    icon: Play,
    color: "text-emerald-400",
    fill: "bg-emerald-500/15",
    activeFill: "data-[state=active]:bg-emerald-500/90",
    activeGlow: "data-[state=active]:shadow-emerald-500/30",
  },
  {
    value: "setup",
    label: "Setup",
    icon: SlidersHorizontal,
    color: "text-violet-400",
    fill: "bg-violet-500/15",
    activeFill: "data-[state=active]:bg-violet-500/90",
    activeGlow: "data-[state=active]:shadow-violet-500/30",
  },
  {
    value: "worker",
    label: "Worker",
    icon: Bot,
    color: "text-sky-500",
    fill: "bg-cyan-500/15",
    activeFill: "data-[state=active]:bg-cyan-500/90",
    activeGlow: "data-[state=active]:shadow-cyan-500/30",
  },
  {
    value: "todo",
    label: "Planner",
    icon: ListTodo,
    color: "text-blue-400",
    fill: "bg-blue-500/15",
    activeFill: "data-[state=active]:bg-blue-500/90",
    activeGlow: "data-[state=active]:shadow-blue-500/30",
  },
  {
    value: "control",
    label: "Control",
    icon: ClipboardList,
    color: "text-slate-400",
    fill: "bg-slate-500/20",
    activeFill: "data-[state=active]:bg-slate-500/90",
    activeGlow: "data-[state=active]:shadow-slate-500/30",
  },
  {
    value: "git",
    label: "Versioning",
    icon: FolderGit2,
    color: "text-amber-400",
    fill: "bg-amber-500/15",
    activeFill: "data-[state=active]:bg-amber-500/90",
    activeGlow: "data-[state=active]:shadow-amber-500/30",
  },
] as const;

const BOTTOM_TAB_ORDER_STORAGE_KEY = "kwdev-project-bottom-tab-order";
const ALL_BOTTOM_TABS = [...TAB_ROW_1, ...TAB_ROW_2] as const;
const DEFAULT_BOTTOM_TAB_ORDER = ["project", "run", "setup", "todo", "worker", "control", "git"] as const;
const LEGACY_BOTTOM_TAB_ORDER = ["project", "todo", "run", "setup", "worker", "control", "git"] as const;

/** Valid tab values for URL ?tab= (deep link). */
const VALID_PROJECT_TABS = new Set([
  ...TAB_ROW_1.map((t) => t.value),
  ...TAB_ROW_2.map((t) => t.value),
]);

export type ProjectDetailsPageContentProps = {
  /** When set (e.g. from /projects?open=id), use this id instead of route params. Used by Tauri to avoid navigating to /projects/[id]. */
  overrideProjectId?: string;
  /** When set, "Back to list" calls this instead of linking to /projects. */
  onBack?: () => void;
};

export function ProjectDetailsPageContent(props: ProjectDetailsPageContentProps = {}) {
  const { overrideProjectId, onBack } = props;
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = overrideProjectId ?? (params?.id as string) ?? "";
  const tabFromUrl = searchParams?.get("tab") ?? null;
  // #region agent log
  React.useEffect(() => {
    if (isTauri) {
      invoke("frontend_debug_log", {
        location: "ProjectDetailsPageContent.tsx:mount",
        message: "project details page mounted",
        data: { projectId, hasId: !!projectId },
      }).catch(() => { });
    }
    debugIngest({
      location: "ProjectDetailsPageContent.tsx:mount",
      message: "project details page mounted",
      data: { projectId, hasId: !!projectId },
      timestamp: Date.now(),
      hypothesisId: "H3",
    });
  }, [projectId]);
  // Record project visit for command palette "recent" ordering
  useEffect(() => {
    if (projectId) recordProjectVisit(projectId);
  }, [projectId]);
  // #endregion
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("worker");
  const [bottomTabOrder, setBottomTabOrder] = useState<string[]>(
    [...DEFAULT_BOTTOM_TAB_ORDER]
  );
  const [draggedBottomTab, setDraggedBottomTab] = useState<string | null>(null);
  const [dragOverBottomTab, setDragOverBottomTab] = useState<string | null>(null);
  // Sync active tab from URL ?tab= when valid (deep link; one-way: URL → tab).
  useEffect(() => {
    if (tabFromUrl && (VALID_PROJECT_TABS as Set<string>).has(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [projectId, tabFromUrl]);
  // Restore last tab from localStorage when no ?tab= in URL (persist preference).
  useEffect(() => {
    if (!projectId || (tabFromUrl != null && tabFromUrl !== "")) return;
    const saved = getProjectDetailTabPreference(projectId);
    setActiveTab(saved);
  }, [projectId, tabFromUrl]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fallback = [...DEFAULT_BOTTOM_TAB_ORDER];
    try {
      const raw = window.localStorage.getItem(BOTTOM_TAB_ORDER_STORAGE_KEY);
      if (!raw) {
        setBottomTabOrder(fallback);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        setBottomTabOrder(fallback);
        return;
      }
      const validSet = new Set(fallback);
      const deduped = parsed.filter(
        (value): value is string => typeof value === "string" && validSet.has(value)
      );
      const isLegacyDefault =
        deduped.length === LEGACY_BOTTOM_TAB_ORDER.length &&
        deduped.every((value, index) => value === LEGACY_BOTTOM_TAB_ORDER[index]);
      const sourceOrder = isLegacyDefault ? fallback : deduped;
      const completed = [...sourceOrder, ...fallback.filter((value) => !sourceOrder.includes(value))];
      const todoIndex = completed.indexOf("todo");
      const workerIndex = completed.indexOf("worker");
      if (todoIndex > workerIndex) {
        const [planner] = completed.splice(todoIndex, 1);
        completed.splice(workerIndex, 0, planner);
      }
      setBottomTabOrder(completed);
    } catch {
      setBottomTabOrder(fallback);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        BOTTOM_TAB_ORDER_STORAGE_KEY,
        JSON.stringify(bottomTabOrder)
      );
    } catch {
      // ignore localStorage errors
    }
  }, [bottomTabOrder]);
  const [viewRunningOpen, setViewRunningOpen] = useState(false);
  const [viewRunningPort, setViewRunningPort] = useState<number | null>(null);
  const [portInput, setPortInput] = useState("");
  const [savingPort, setSavingPort] = useState(false);
  const [plannerRefreshKey, setPlannerRefreshKey] = useState(0);
  const [docsRefreshKey, setDocsRefreshKey] = useState(0);
  const [controlTabRefreshKey, setControlTabRefreshKey] = useState(0);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [agentProvider, setAgentProviderState] = useState<AgentProvider>("cursor");

  // Restore agent provider from localStorage on project change
  useEffect(() => {
    if (projectId) setAgentProviderState(getAgentProvider(projectId));
  }, [projectId]);

  const handleProviderChange = useCallback((provider: AgentProvider) => {
    setAgentProviderState(provider);
    if (projectId) setAgentProvider(projectId, provider);
  }, [projectId]);

  useEffect(() => {
    if (project?.runPort != null) setPortInput(String(project.runPort));
  }, [project?.runPort]);

  // Autosave runPort shortly after user edits a valid value.
  useEffect(() => {
    if (!projectId || !mountedRef.current) return;
    const trimmed = portInput.trim();
    if (!trimmed) return;
    const parsed = parseInt(trimmed, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) return;
    if (project?.runPort === parsed) return;

    const timeout = window.setTimeout(async () => {
      setSavingPort(true);
      try {
        const updated = await updateProject(projectId, { runPort: parsed });
        if (mountedRef.current && updated?.runPort != null) {
          setProject((p) => (p ? { ...p, runPort: updated.runPort } : p));
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save port");
      } finally {
        setSavingPort(false);
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [portInput, project?.runPort, projectId]);

  const mountedRef = useRef(true);
  const setPageTitle = useSetPageTitle();
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Dynamic document title for project detail (accessibility and tab/bookmark clarity).
  useEffect(() => {
    const title = project?.name ?? "Project";
    setPageTitle(title);
    return () => setPageTitle(null);
  }, [project?.name, setPageTitle]);

  // Persist current project in DB when project details are loaded (Tauri only; backend/agents can use get_current_project_id).
  useEffect(() => {
    if (!isTauri || !projectId || !project || project.id !== projectId) return;
    invoke("set_current_project_id", { project_id: projectId }).catch(() => { });
  }, [projectId, project?.id]);

  // When Analyze runs via Worker (analyze-doc), refresh doc tabs when the run completes.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { onComplete?: string };
      if (detail?.onComplete === "analyze-doc") {
        setDocsRefreshKey((k) => k + 1);
      }
    };
    window.addEventListener("run-complete", handler);
    return () => window.removeEventListener("run-complete", handler);
  }, []);

  // When a ticket Implement All run completes, switch to Control tab and refresh it (unless from auto idea-driven; stay on Worker/Night shift tab).
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { projectId?: string; fromAutoIdeaDriven?: boolean };
      if (detail?.projectId === projectId && !detail?.fromAutoIdeaDriven) {
        setActiveTab("control");
        setControlTabRefreshKey((k) => k + 1);
      }
    };
    window.addEventListener("ticket-implementation-done", handler);
    return () => window.removeEventListener("ticket-implementation-done", handler);
  }, [projectId]);
  const handleBottomTabDrop = useCallback(
    (targetValue: string) => {
      if (!draggedBottomTab || draggedBottomTab === targetValue) return;
      setBottomTabOrder((previous) => {
        const fromIndex = previous.indexOf(draggedBottomTab);
        const toIndex = previous.indexOf(targetValue);
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return previous;
        const next = [...previous];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    },
    [draggedBottomTab]
  );

  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isTauri) {
        invoke("frontend_debug_log", { location: "ProjectDetailsPageContent.tsx:fetchProject", message: "ProjectDetails: about to call get_project_resolved", data: { projectId } }).catch(() => { });
      }
      const data = await getProjectResolved(projectId);
      if (mountedRef.current) setProject(data);
      // #region agent log
      debugIngest({
        location: "ProjectDetailsPageContent.tsx:fetchProject:ok",
        message: "getProjectResolved succeeded",
        data: { projectId, hasProject: !!data },
        timestamp: Date.now(),
        hypothesisId: "H4",
      });
      // #endregion
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (mountedRef.current) setError(errMsg);
      // #region agent log
      if (isTauri) {
        invoke("frontend_debug_log", { location: "ProjectDetailsPageContent.tsx:fetchProject:catch", message: "ProjectDetails: get_project_resolved failed", data: { projectId, error: errMsg } }).catch(() => { });
      }
      debugIngest({
        location: "ProjectDetailsPageContent.tsx:fetchProject:err",
        message: "getProjectResolved failed",
        data: { projectId, error: errMsg },
        timestamp: Date.now(),
        hypothesisId: "H4",
      });
      // #endregion
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Load project IDs for prev/next navigation
  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then((projects) => {
        if (!cancelled) setProjectIds(projects.map((p) => p.id));
      })
      .catch(() => {
        if (!cancelled) setProjectIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <Loader2 className="relative size-10 animate-spin text-primary" />
          </div>
          <p className="text-xs text-muted-foreground animate-pulse tracking-wider">
            Loading project…
          </p>
        </div>
      </div>
    );
  }

  /* ─── Error State ─── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 px-4">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 backdrop-blur-sm p-8 max-w-md w-full text-center space-y-4">
          <div className="mx-auto size-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="size-6 text-destructive" />
          </div>
          <p className="text-sm text-destructive/90 normal-case">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null);
              fetchProject();
            }}
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  /* ─── Not Found ─── */
  if (!project) {
    // #region agent log
    debugIngest({
      location: "ProjectDetailsPageContent.tsx:notFound",
      message: "rendering project not found",
      data: { projectId },
      timestamp: Date.now(),
      hypothesisId: "H4",
    });
    // #endregion
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Project not found.</p>
      </div>
    );
  }

  const currentIndex = projectIds.indexOf(projectId);
  const prevId = currentIndex > 0 ? projectIds[currentIndex - 1] : undefined;
  const nextId = currentIndex >= 0 && currentIndex < projectIds.length - 1 ? projectIds[currentIndex + 1] : undefined;

  const ticketCount = project.ticketIds?.length ?? 0;

  const designCount = project.designIds?.length ?? 0;
  const architectureCount = project.architectureIds?.length ?? 0;
  const bottomTabMap = new Map(ALL_BOTTOM_TABS.map((tab) => [tab.value, tab] as const));
  const orderedBottomTabs = bottomTabOrder
    .map((value) => bottomTabMap.get(value))
    .filter((tab): tab is (typeof ALL_BOTTOM_TABS)[number] => !!tab);

  return (
    <ErrorBoundary fallbackTitle="Project detail error">
      <div
        className="flex flex-col gap-0 w-full flex-1 min-h-0"
        data-testid="project-detail-page"
      >
        {/* ═══════════════ HERO HEADER ═══════════════ */}
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-primary/[0.04] p-3 md:p-4 mb-4 mx-4 mt-3">
          {/* Decorative gradient orbs */}
          <div className="absolute -top-24 -right-24 size-48 rounded-full bg-primary/[0.07] blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 size-36 rounded-full bg-info/[0.05] blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 right-1/4 size-24 rounded-full bg-violet-500/[0.04] blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="min-w-0 flex justify-start">
                <Breadcrumb
                  items={[
                    { label: "Projects", href: "/projects" },
                    { label: project.name ?? "Project" },
                  ]}
                  className="mb-0.5"
                />
              </div>
              <div className="flex items-center justify-center overflow-x-auto">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Select value={agentProvider} onValueChange={(value: AgentProvider) => handleProviderChange(value)}>
                    <SelectTrigger className="h-7 min-w-[106px] text-xs">
                      <SelectValue placeholder="Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cursor">Cursor</SelectItem>
                      <SelectItem value="claude">Claude</SelectItem>
                      <SelectItem value="gemini">Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-400 hover:text-rose-300 hover:bg-destructive/10 transition-all duration-200 gap-1.5"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="size-3.5 text-rose-400" />
                  <span className="text-xs">Delete</span>
                </Button>
              </div>
            </div>

            {/* Delete project confirmation (same pattern as ProjectHeader, ADR 0130 / 0189) */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete project?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  This project will be removed from the app. This cannot be undone.
                </p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      await deleteProject(projectId);
                      setDeleteConfirmOpen(false);
                      toast.success("Project deleted");
                      if (onBack) onBack();
                      else router.replace("/projects");
                    }}
                  >
                    Delete project
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Project Title & Description */}
            <div className="space-y-1 py-1">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="flex justify-start">
                  {prevId ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (overrideProjectId != null) {
                          const q = activeTab ? `?open=${encodeURIComponent(prevId)}&tab=${activeTab}` : `?open=${encodeURIComponent(prevId)}`;
                          router.push(`/projects${q}`);
                        } else {
                          router.push(activeTab ? `/projects/${prevId}?tab=${activeTab}` : `/projects/${prevId}`);
                        }
                      }}
                      className="shrink-0 rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label="Previous project"
                    >
                      <ArrowLeft className="size-5" />
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-lg p-2 text-muted-foreground/40 cursor-not-allowed" aria-hidden>
                      <ArrowLeft className="size-5" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex items-center justify-center gap-2 py-1.5">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight text-center py-1">
                    {project.name}
                  </h1>
                </div>
                <div className="flex justify-end">
                  {nextId ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (overrideProjectId != null) {
                          const q = activeTab ? `?open=${encodeURIComponent(nextId)}&tab=${activeTab}` : `?open=${encodeURIComponent(nextId)}`;
                          router.push(`/projects${q}`);
                        } else {
                          router.push(activeTab ? `/projects/${nextId}?tab=${activeTab}` : `/projects/${nextId}`);
                        }
                      }}
                      className="shrink-0 rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label="Next project"
                    >
                      <ArrowRight className="size-5" />
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-lg p-2 text-muted-foreground/40 cursor-not-allowed" aria-hidden>
                      <ArrowRight className="size-5" />
                    </span>
                  )}
                </div>
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed normal-case">
                  {project.description}
                </p>
              )}

            </div>

            {/* Metadata badges */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <div className="flex items-center gap-2 whitespace-nowrap">
                {project.created_at && (
                  <MetadataBadge
                    icon={<Calendar className="size-3" />}
                    color="bg-muted/50 border-border/50 text-muted-foreground"
                  >
                    <span className="normal-case">
                      {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </MetadataBadge>
                )}
                {ticketCount > 0 && (
                  <CountBadge
                    icon={<Hash className="size-2.5" />}
                    count={ticketCount}
                    label="tickets"
                    color="bg-blue-500/10 border-blue-500/20 text-blue-400"
                  />
                )}

                {designCount > 0 && (
                  <CountBadge
                    icon={<Hash className="size-2.5" />}
                    count={designCount}
                    label="designs"
                    color="bg-violet-500/10 border-violet-500/20 text-violet-400"
                  />
                )}
                {architectureCount > 0 && (
                  <CountBadge
                    icon={<Hash className="size-2.5" />}
                    count={architectureCount}
                    label="architectures"
                    color="bg-teal-500/10 border-teal-500/20 text-teal-400"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════ TABS: main content + bottom navigation (mobile-style) ═══════════════ */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            if (isTauri) {
              invoke("frontend_debug_log", { location: "ProjectDetailsPageContent.tsx:tabChange", message: "ProjectDetails: tab changed", data: { from: activeTab, to: v } }).catch(() => { });
            }
            setActiveTab(v);
            if (projectId) setProjectDetailTabPreference(projectId, v);
          }}
          className="flex flex-col w-full min-h-0 flex-1"
          data-testid="project-detail-tabs"
        >
          {/* Main content: selected tab; pb clears fixed bottom nav */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden px-6 pb-20">
          {/* ── Project Tab ── */}
          <TabsContent
            value="project"
            key={`${projectId}-project`}
            className="mt-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          >
            <ProjectProjectTab project={project} projectId={projectId} docsRefreshKey={docsRefreshKey} mode="project" />
          </TabsContent>

          {/* ── Setup Tab ── */}
          <TabsContent
            value="setup"
            key={`${projectId}-setup`}
            className="mt-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          >
            <ProjectProjectTab project={project} projectId={projectId} docsRefreshKey={docsRefreshKey} mode="setup" />
          </TabsContent>

          {/* ── Planner Tab ── */}
          <TabsContent
            value="todo"
            key={`${projectId}-todo`}
            className="mt-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 overflow-y-auto min-h-0"
          >
            <div key={plannerRefreshKey} className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 md:p-6 min-h-0 space-y-4">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2">
                  <ListTodo className="size-4 text-blue-400" />
                  <span className="text-sm font-semibold">Planner board</span>
                </div>
                <ProjectTicketsTab
                  project={project}
                  projectId={projectId}
                  fetchProject={fetchProject}
                />
              </div>

              <div data-testid="planner-secondary-tabs" className="rounded-xl border border-border/40 bg-card/30 p-3 md:p-4">
                <Tabs defaultValue="planner-ideas" className="w-full">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-xs text-muted-foreground">Switch between idea intake and milestone planning.</p>
                    <TabsList>
                      <TabsTrigger value="planner-ideas" className="gap-1.5">
                        <Lightbulb className="size-3.5" />
                        Ideas
                      </TabsTrigger>
                      <TabsTrigger value="planner-milestones" className="gap-1.5">
                        <Flag className="size-3.5" />
                        Milestones
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="planner-ideas" className="mt-0">
                    <ProjectIdeasDocTab project={project} projectId={projectId} docsRefreshKey={docsRefreshKey} />
                  </TabsContent>

                  <TabsContent value="planner-milestones" className="mt-0">
                    <ProjectMilestonesTab
                      project={project}
                      projectId={projectId}
                      onTicketAdded={() => setPlannerRefreshKey((k) => k + 1)}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </TabsContent>

          {/* ── Control Tab (implementation log) ── */}
          <TabsContent
            value="control"
            key={`${projectId}-control`}
            className="mt-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          >
            <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 md:p-6">
              <ProjectControlTab projectId={projectId} refreshKey={controlTabRefreshKey} />
            </div>
          </TabsContent>

          {/* ── Worker Tab (includes Plan section) ── */}
          <TabsContent
            value="worker"
            key={`${projectId}-worker`}
            className="mt-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          >
            {project && (
              <ProjectRunTab project={project} projectId={projectId} agentProvider={agentProvider} />
            )}
          </TabsContent>

          <TabsContent
            value="run"
            key={`${projectId}-run`}
            className="mt-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          >
            <ProjectBottomRunTab
              project={project}
              projectId={projectId}
              portInput={portInput}
              onPortInputChange={setPortInput}
              savingPort={savingPort}
              onOpenRunningModal={(port) => {
                setViewRunningPort(port);
                setViewRunningOpen(true);
              }}
              onProjectUpdate={fetchProject}
            />
          </TabsContent>

          {/* ── Versioning Tab ── */}
          <TabsContent
            value="git"
            key={`${projectId}-git`}
            className="mt-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          >
            <ProjectGitTab project={project} projectId={projectId} />
          </TabsContent>
          </div>

          {/* Bottom navigation: fixed, always visible */}
          <TabsList
            className="fixed bottom-3 left-1/2 z-40 inline-flex w-auto max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-row flex-nowrap items-center justify-center gap-2 overflow-x-auto overflow-y-hidden rounded-full border-0 bg-transparent p-2 shadow-none backdrop-blur-none"
            aria-label="Project sections"
          >
            {orderedBottomTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                data-testid={`tab-${tab.value}`}
                draggable
                onDragStart={(event) => {
                  setDraggedBottomTab(tab.value);
                  setDragOverBottomTab(tab.value);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", tab.value);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOverBottomTab(tab.value);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleBottomTabDrop(tab.value);
                  setDraggedBottomTab(null);
                  setDragOverBottomTab(null);
                }}
                onDragEnd={() => {
                  setDraggedBottomTab(null);
                  setDragOverBottomTab(null);
                }}
                className={cn(
                  "group relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border-0 p-0 text-xs font-semibold transition-all duration-200",
                  tab.fill,
                  "text-muted-foreground hover:text-foreground",
                  "data-[state=active]:text-white data-[state=active]:border-0",
                  dragOverBottomTab === tab.value && draggedBottomTab !== tab.value && "ring-2 ring-primary/60",
                  tab.activeFill,
                  tab.activeGlow
                )}
              >
                <tab.icon
                  className={cn(
                    "size-5 shrink-0 transition-colors duration-200",
                    activeTab === tab.value ? "text-white" : tab.color,
                    activeTab !== tab.value && "opacity-90 group-hover:opacity-100"
                  )}
                />
                <span className="sr-only">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* View Running Project modal: iframe + open in new tab — full viewport width/height */}
      <Dialog open={viewRunningOpen} onOpenChange={setViewRunningOpen}>
        <DialogContent className="max-w-[100vw] w-[100vw] sm:max-w-[100vw] h-[100vh] max-h-[100vh] flex flex-col gap-3 p-0 overflow-hidden rounded-none border-0 sm:rounded-none sm:border-0">
          <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
            <DialogTitle className="text-sm font-medium">Running project</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col gap-2 px-4 pb-4 overflow-hidden">
            {viewRunningPort != null && (
              <>
                <a
                  href={`http://localhost:${viewRunningPort}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0"
                >
                  <ExternalLink className="size-3" />
                  Open in new tab
                </a>
                <p className="text-xs text-muted-foreground shrink-0">
                  If the app does not load below (e.g. when this page is on HTTPS), use &quot;Open in new tab&quot; above.
                </p>
                <div className="flex-1 min-h-0 rounded-md border border-border bg-muted/30 overflow-hidden">
                  <iframe
                    title="Running project"
                    src={`http://localhost:${viewRunningPort}`}
                    className="w-full h-full min-h-[400px] block rounded-md border-0"
                    style={{ height: "100%" }}
                  />
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This project will be removed from the app. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await deleteProject(projectId);
                setDeleteConfirmOpen(false);
                toast.success("Project deleted");
                if (onBack) onBack();
                else router.replace("/projects");
              }}
            >
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}

/* SectionCard, MetadataBadge, CountBadge are now imported from @/components/shared/DisplayPrimitives */
