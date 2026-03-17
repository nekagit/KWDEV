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
  Pencil,
  Lightbulb,
  Activity,
  ExternalLink,
  Monitor,
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
import { ErrorBoundary } from "@/components/organisms/ErrorBoundary";
import { cn } from "@/lib/utils";
import { SectionCard, MetadataBadge, CountBadge } from "@/components/molecules/Displays/DisplayPrimitives";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dialog as SharedDialog } from "@/components/molecules/FormsAndDialogs/Dialog";
import { ButtonGroup } from "@/components/molecules/ControlsAndButtons/ButtonGroup";
import { Input } from "@/components/ui/input";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TAB_ROW_1 = [
  { value: "project", label: "Project", icon: FolderOpen, color: "text-sky-400", activeGlow: "shadow-sky-500/10" },
] as const;

const TAB_ROW_2 = [
  { value: "ideas", label: "Ideas", icon: Lightbulb, color: "text-amber-500", activeGlow: "shadow-amber-500/10" },
  { value: "milestones", label: "Milestones", icon: Flag, color: "text-fuchsia-400", activeGlow: "shadow-fuchsia-500/10" },
  { value: "todo", label: "Planner", icon: ListTodo, color: "text-blue-400", activeGlow: "shadow-blue-500/10" },
  { value: "worker", label: "Worker", icon: Activity, color: "text-sky-500", activeGlow: "shadow-sky-500/10" },
  { value: "control", label: "Control", icon: ClipboardList, color: "text-slate-400", activeGlow: "shadow-slate-500/10" },
  { value: "git", label: "Versioning", icon: FolderGit2, color: "text-amber-400", activeGlow: "shadow-amber-500/10" },
] as const;

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
  const [viewRunningOpen, setViewRunningOpen] = useState(false);
  const [portEdit, setPortEdit] = useState(false);
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

  return (
    <ErrorBoundary fallbackTitle="Project detail error">
      <div
        className="flex flex-col gap-0 w-full flex-1 min-h-0"
        data-testid="project-detail-page"
      >
        {/* ═══════════════ HERO HEADER ═══════════════ */}
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-primary/[0.04] p-6 md:p-8 mb-8 mx-4 mt-4">
          {/* Decorative gradient orbs */}
          <div className="absolute -top-24 -right-24 size-48 rounded-full bg-primary/[0.07] blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 size-36 rounded-full bg-info/[0.05] blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 right-1/4 size-24 rounded-full bg-violet-500/[0.04] blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-5">
            <Breadcrumb
              items={[
                { label: "Projects", href: "/projects" },
                { label: project.name ?? "Project" },
              ]}
              className="mb-0.5"
            />
            {/* Top bar: delete */}
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all duration-200 gap-1.5"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 className="size-3.5" />
                <span className="text-xs">Delete</span>
              </Button>
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
            <div className="space-y-2.5">
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
                <div className="min-w-0 flex items-center justify-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight text-center">
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

              {/* Agent Provider Switcher — selected button always black */}
              <div className="flex items-center justify-center gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => handleProviderChange("cursor")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-l-md border transition-colors",
                    agentProvider === "cursor"
                      ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-black/10 hover:text-foreground hover:border-black/30 dark:hover:bg-white/10 dark:hover:border-white/30"
                  )}
                >
                  Cursor
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderChange("claude")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium border border-l-0 transition-colors",
                    agentProvider === "claude"
                      ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-black/10 hover:text-foreground hover:border-black/30 dark:hover:bg-white/10 dark:hover:border-white/30"
                  )}
                >
                  Claude
                </button>
                <button
                  type="button"
                  onClick={() => handleProviderChange("gemini")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-r-md border border-l-0 transition-colors",
                    agentProvider === "gemini"
                      ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-black/10 hover:text-foreground hover:border-black/30 dark:hover:bg-white/10 dark:hover:border-white/30"
                  )}
                >
                  Gemini
                </button>
              </div>
            </div>

            {/* Metadata: port, View Running, badges */}
            <div className="flex flex-wrap items-center justify-between gap-4 mt-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* Run port: display or set localhost port for View Running Project (always show so port can be set even without repo path) */}
                <>
                  {project.runPort != null ? (
                    portEdit ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={1}
                          max={65535}
                          placeholder="Port"
                          value={portInput}
                          onChange={(e) => setPortInput(e.target.value)}
                          className="h-7 w-20 text-xs font-mono"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[10px]"
                          disabled={savingPort}
                          onClick={async () => {
                            const num = parseInt(portInput, 10);
                            if (Number.isNaN(num) || num < 1 || num > 65535) {
                              toast.error("Enter a port between 1 and 65535");
                              return;
                            }
                            setSavingPort(true);
                            try {
                              const updated = await updateProject(projectId, { runPort: num });
                              if (mountedRef.current && updated?.runPort != null) {
                                setProject((p) => (p ? { ...p, runPort: updated.runPort } : p));
                              }
                              await fetchProject();
                              setPortEdit(false);
                              setPortInput("");
                              toast.success("Run port updated.");
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Failed to save port");
                            } finally {
                              setSavingPort(false);
                            }
                          }}
                        >
                          {savingPort ? <Loader2 className="size-3 animate-spin" /> : "Save"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-1.5"
                          onClick={() => {
                            setPortEdit(false);
                            setPortInput("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <MetadataBadge
                        icon={<Monitor className="size-3" />}
                        color="bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400"
                      >
                        <span className="normal-case font-mono">
                          localhost:{project.runPort}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPortInput(String(project.runPort ?? ""));
                            setPortEdit(true);
                          }}
                          className="ml-1 rounded p-0.5 hover:bg-sky-500/20"
                          aria-label="Change port"
                        >
                          <Pencil className="size-2.5" />
                        </button>
                      </MetadataBadge>
                    )
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={1}
                        max={65535}
                        placeholder="Port"
                        value={portInput}
                        onChange={(e) => setPortInput(e.target.value)}
                        className="h-7 w-20 text-xs font-mono"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[10px] font-semibold uppercase tracking-wider gap-1"
                        disabled={savingPort}
                        onClick={async () => {
                          const num = parseInt(portInput, 10);
                          if (Number.isNaN(num) || num < 1 || num > 65535) {
                            toast.error("Enter a port between 1 and 65535");
                            return;
                          }
                          setSavingPort(true);
                          try {
                            const updated = await updateProject(projectId, { runPort: num });
                            if (mountedRef.current && updated?.runPort != null) {
                              setProject((p) => (p ? { ...p, runPort: updated.runPort } : p));
                            }
                            await fetchProject();
                            setPortInput("");
                            toast.success("Run port saved.");
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Failed to save port");
                          } finally {
                            setSavingPort(false);
                          }
                        }}
                      >
                        {savingPort ? <Loader2 className="size-3 animate-spin" /> : "Set port"}
                      </Button>
                    </div>
                  )}
                </>
                {/* View Running Project: opens modal with iframe (always visible; disabled until port is set) */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[10px] font-semibold uppercase tracking-wider gap-1.5 border-sky-500/30 hover:bg-sky-500/5 hover:border-sky-500/50 transition-all duration-300 shadow-sm"
                  title={project.runPort == null ? "Set run port above first" : "Open running app in modal"}
                  onClick={() => setViewRunningOpen(true)}
                  disabled={project.runPort == null}
                >
                  <Monitor className="size-3 text-sky-500" />
                  View Running Project
                </Button>
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

        {/* ═══════════════ TABS: left sidebar (project sections) + main content ═══════════════ */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            if (isTauri) {
              invoke("frontend_debug_log", { location: "ProjectDetailsPageContent.tsx:tabChange", message: "ProjectDetails: tab changed", data: { from: activeTab, to: v } }).catch(() => { });
            }
            setActiveTab(v);
            if (projectId) setProjectDetailTabPreference(projectId, v);
          }}
          className="flex flex-row gap-6 w-full min-h-0 flex-1"
          data-testid="project-detail-tabs"
        >
          {/* Left sidebar: project section tabs (vertical) */}
          <TabsList
            className="inline-flex h-auto flex-col flex-nowrap gap-1 rounded-none rounded-r-xl border-r border-border/60 bg-sidebar p-2 w-52 shrink-0 min-h-0 overflow-y-auto"
            aria-label="Project sections"
          >
            {[...TAB_ROW_1, ...TAB_ROW_2].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                data-testid={`tab-${tab.value}`}
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-200 w-full justify-start",
                  "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-muted/60",
                  "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/60",
                  activeTab === tab.value && tab.activeGlow
                )}
              >
                <tab.icon
                  className={cn(
                    "size-4 shrink-0 transition-colors duration-200",
                    activeTab === tab.value ? tab.color : ""
                  )}
                />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Main content: selected tab; horizontal padding so content does not touch viewport edge */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-auto px-6">
          {/* ── Project Tab ── */}
          <TabsContent
            value="project"
            key={`${projectId}-project`}
            className="mt-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          >
            <ProjectProjectTab project={project} projectId={projectId} docsRefreshKey={docsRefreshKey} onProjectUpdate={fetchProject} />
          </TabsContent>

          {/* ── Ideas Tab ── */}
          <TabsContent
            value="ideas"
            key={`${projectId}-ideas`}
            className="mt-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          >
            <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 md:p-6">
              <ProjectIdeasDocTab project={project} projectId={projectId} docsRefreshKey={docsRefreshKey} />
            </div>
          </TabsContent>

          {/* ── Planner Tab ── */}
          <TabsContent
            value="todo"
            key={`${projectId}-todo`}
            className="mt-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 overflow-y-auto min-h-0"
          >
            <div key={plannerRefreshKey} className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 md:p-6 min-h-0">
              <ProjectTicketsTab
                project={project}
                projectId={projectId}
                fetchProject={fetchProject}
              />
            </div>
          </TabsContent>

          {/* ── Milestones Tab ── */}
          <TabsContent
            value="milestones"
            key={`${projectId}-milestones`}
            className="mt-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          >
            <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 md:p-6">
              <ProjectMilestonesTab
                project={project}
                projectId={projectId}
                onTicketAdded={() => setPlannerRefreshKey((k) => k + 1)}
              />
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

          {/* ── Versioning Tab ── */}
          <TabsContent
            value="git"
            key={`${projectId}-git`}
            className="mt-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          >
            <ProjectGitTab project={project} projectId={projectId} />
          </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* View Running Project modal: iframe + open in new tab — full viewport width/height */}
      <Dialog open={viewRunningOpen} onOpenChange={setViewRunningOpen}>
        <DialogContent className="max-w-[100vw] w-[100vw] sm:max-w-[100vw] h-[100vh] max-h-[100vh] flex flex-col gap-3 p-0 overflow-hidden rounded-none border-0 sm:rounded-none sm:border-0">
          <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
            <DialogTitle className="text-sm font-medium">Running project</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col gap-2 px-4 pb-4 overflow-hidden">
            {project?.runPort != null && (
              <>
                <a
                  href={`http://localhost:${project.runPort}`}
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
                    src={`http://localhost:${project.runPort}`}
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
