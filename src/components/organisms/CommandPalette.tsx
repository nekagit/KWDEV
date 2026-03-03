"use client";

/**
 * Global command palette (⌘K): search actions, navigate, run commands. Used by app-shell.
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { LayoutDashboard, MessageSquare, Folders, Folder, FolderOpen, FolderPlus, FolderSearch, FolderCog, Settings, Moon, Sun, Keyboard, Loader2, RefreshCw, RotateCw, X, Activity, Printer, ChevronUp, ChevronDown, Focus, Search, ClipboardList, Copy, HardDrive, Trash2, Square, Code2, Terminal, RotateCcw, PanelLeft, TestTube2, ExternalLink, Flag, FolderGit2, ListTodo, Palette, Building2, Download, FileSpreadsheet, FileText, Link, ScanSearch, Plug2 } from "lucide-react";
import { default as FileJson } from "lucide-react/dist/esm/icons/file-json";
import { useQuickActions } from "@/context/quick-actions-context";
import { useUITheme } from "@/context/ui-theme";
import { isValidUIThemeId } from "@/data/ui-theme-templates";
import { getApiHealth } from "@/lib/api-health";
import { getAppVersion } from "@/lib/app-version";
import { copyAppInfoToClipboard } from "@/lib/copy-app-info";
import { copyAppVersionToClipboard } from "@/lib/copy-app-version";
import { downloadAppInfoAsMarkdown, copyAppInfoAsMarkdownToClipboard } from "@/lib/download-app-info-md";
import { downloadAppInfoAsJson, copyAppInfoAsJsonToClipboard } from "@/lib/download-app-info-json";
import { copyAppDataFolderPath } from "@/lib/copy-app-data-folder-path";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { openAppDataFolderInFileManager } from "@/lib/open-app-data-folder";
import { fetchTechStackForProject } from "@/lib/fetch-tech-stack-for-project";
import { copyAllPromptsAsMarkdownToClipboard, downloadAllPromptsAsMarkdown } from "@/lib/download-all-prompts-md";
import { downloadAllPromptsAsJson, copyAllPromptsAsJsonToClipboard } from "@/lib/download-all-prompts-json";
import { downloadAllPromptsAsCsv, copyAllPromptsAsCsvToClipboard } from "@/lib/download-all-prompts-csv";
import { downloadAllCursorPromptsAsCsv, copyAllCursorPromptsAsCsvToClipboard } from "@/lib/download-all-cursor-prompts-csv";
import { downloadAllCursorPromptsAsJson, copyAllCursorPromptsAsJsonToClipboard } from "@/lib/download-all-cursor-prompts-json";
import { downloadAllCursorPromptsAsMarkdown, copyAllCursorPromptsAsMarkdownToClipboard } from "@/lib/download-all-cursor-prompts-md";
import {
  downloadTechStackAsMarkdown,
  downloadTechStack,
  copyTechStackAsMarkdownToClipboard,
} from "@/lib/download-tech-stack";
import {
  downloadTechStackAsCsv,
  copyTechStackAsCsvToClipboard,
} from "@/lib/download-tech-stack-csv";
import { copyTechStackToClipboard } from "@/lib/copy-tech-stack";
import { downloadProjectsListAsJson, copyProjectsListAsJsonToClipboard } from "@/lib/download-projects-list-json";
import { downloadProjectsListAsCsv, copyProjectsListAsCsvToClipboard } from "@/lib/download-projects-list-csv";
import {
  downloadProjectsListAsMarkdown,
  copyProjectsListAsMarkdownToClipboard,
} from "@/lib/download-projects-list-md";
import {
  copyActiveProjectsAsJsonToClipboard,
  downloadActiveProjectsAsJson,
  copyActiveProjectsAsCsvToClipboard,
  downloadActiveProjectsAsCsv,
} from "@/lib/active-projects-export";
import { copyCurrentPageUrlToClipboard } from "@/lib/copy-current-page-url";
// Ideas, planner, and milestones folder imports removed - now stored in database only
import { openProjectCursorFolderInFileManager } from "@/lib/open-project-cursor-folder";
import { openProjectFolderInFileManager } from "@/lib/open-project-folder";
import { openProjectInEditor } from "@/lib/open-project-in-editor";
import { openProjectInSystemTerminal } from "@/lib/open-project-in-terminal";
import { listProjects } from "@/lib/api-projects";
import { invoke, isTauri } from "@/lib/tauri";
import { parseFirstRemoteUrl } from "@/lib/parse-first-remote-url";
import type { GitInfo } from "@/types/git";
import { getRecentProjectIds } from "@/lib/recent-projects";
import { setRunHistoryPreferences, DEFAULT_RUN_HISTORY_PREFERENCES, RUN_HISTORY_PREFERENCES_RESTORED_EVENT } from "@/lib/run-history-preferences";
import { setProjectsListViewPreference, DEFAULT_PROJECTS_LIST_VIEW_PREFERENCE, PROJECTS_LIST_VIEW_PREFERENCE_RESTORED_EVENT } from "@/lib/projects-list-view-preference";
import { dispatchFocusFilterEvent } from "@/lib/focus-filter-event";
import { dispatchSidebarToggle } from "@/lib/sidebar-toggle-event";
import { copyAllRunHistoryToClipboard } from "@/lib/copy-all-run-history";
import { copyRunHistoryStatsSummaryToClipboard } from "@/lib/copy-run-history-stats-summary";
import {
  downloadRunHistoryStatsAsJson,
  copyRunHistoryStatsAsJsonToClipboard,
} from "@/lib/download-run-history-stats-json";
import {
  downloadRunHistoryStatsAsCsv,
  copyRunHistoryStatsAsCsvToClipboard,
} from "@/lib/download-run-history-stats-csv";
import { copyImplementationLogToClipboard } from "@/lib/copy-implementation-log-to-clipboard";
import { downloadImplementationLog } from "@/lib/download-implementation-log";
import { getProjectResolved } from "@/lib/api-projects";
import {
  downloadProjectDesignsAsJson,
  copyProjectDesignsAsJsonToClipboard,
} from "@/lib/download-project-designs-json";
import {
  downloadProjectDesignsAsMarkdown,
  copyProjectDesignsAsMarkdownToClipboard,
} from "@/lib/download-project-designs-md";
import {
  downloadProjectArchitecturesAsJson,
  copyProjectArchitecturesAsJsonToClipboard,
} from "@/lib/download-project-architectures-json";
import {
  downloadProjectArchitecturesAsMarkdown,
  copyProjectArchitecturesAsMarkdownToClipboard,
} from "@/lib/download-project-architectures-md";
import { fetchProjectTicketsAndKanban } from "@/lib/fetch-project-tickets-and-kanban";
import { fetchProjectMilestones } from "@/lib/fetch-project-milestones";
import {
  downloadProjectTicketsAsJson,
  copyProjectTicketsAsJsonToClipboard,
} from "@/lib/download-project-tickets-json";
import {
  downloadProjectTicketsAsCsv,
  copyProjectTicketsAsCsvToClipboard,
} from "@/lib/download-project-tickets-csv";
import {
  downloadProjectTicketsAsMarkdown,
  copyProjectTicketsAsMarkdownToClipboard,
} from "@/lib/download-project-tickets-md";
import {
  downloadProjectMilestonesAsJson,
  copyProjectMilestonesAsJsonToClipboard,
} from "@/lib/download-project-milestones-json";
import {
  downloadProjectMilestonesAsCsv,
  copyProjectMilestonesAsCsvToClipboard,
} from "@/lib/download-project-milestones-csv";
import {
  downloadProjectMilestonesAsMarkdown,
  copyProjectMilestonesAsMarkdownToClipboard,
} from "@/lib/download-project-milestones-md";
import { copySingleRunAsPlainTextToClipboard } from "@/lib/copy-single-run-as-plain-text";
import { downloadSingleRunAsPlainText } from "@/lib/download-single-run-as-plain-text";
import { downloadAllRunHistory } from "@/lib/download-all-run-history";
import { downloadAllRunHistoryJson, copyAllRunHistoryJsonToClipboard } from "@/lib/download-all-run-history-json";
import { downloadAllRunHistoryCsv, copyAllRunHistoryCsvToClipboard } from "@/lib/download-all-run-history-csv";
import { downloadAllRunHistoryMarkdown, copyAllRunHistoryMarkdownToClipboard } from "@/lib/download-all-run-history-md";
import { copyKeyboardShortcutsAsMarkdownToClipboard, copyKeyboardShortcutsAsJsonToClipboard, copyKeyboardShortcutsAsCsvToClipboard, downloadKeyboardShortcutsAsMarkdown, downloadKeyboardShortcutsAsJson, downloadKeyboardShortcutsAsCsv } from "@/lib/export-keyboard-shortcuts";
import { getAppRepositoryUrl } from "@/lib/app-repository";
import type { Project } from "@/types/project";
import type { DesignRecord } from "@/types/design";
import type { ArchitectureRecord } from "@/types/architecture";
import type { ParsedTicket } from "@/lib/todos-kanban";
import type { MilestoneRecord } from "@/types/milestone";
import { useRunStore } from "@/store/run-store";
import { toast } from "sonner";
import { CommandPaletteAnnouncer } from "@/components/molecules/Accessible/CommandPaletteAnnouncer";

export type CommandPaletteEntry =
  | { href: string; label: string; icon: React.ComponentType<{ className?: string }>; onSelect?: never }
  | { href?: never; label: string; icon: React.ComponentType<{ className?: string }>; onSelect: () => void };

/** Nav entries aligned with SidebarNavigation (Dashboard, Tools, Work, System). */
const NAV_ENTRIES: CommandPaletteEntry[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app-analyzer", label: "Analyzer", icon: ScanSearch },
  { href: "/integrations", label: "Integrations", icon: Plug2 },
  { href: "/projects", label: "Projects", icon: Folders },
  { href: "/projects/new", label: "New project", icon: FolderPlus },
  { href: "/prompts", label: "Prompts", icon: MessageSquare },
  { href: "/run", label: "Run", icon: Activity },
  { href: "/testing", label: "Testing", icon: TestTube2 },
  { href: "/planner", label: "Planner", icon: ListTodo },
  { href: "/design", label: "Design", icon: Palette },
  { href: "/architecture", label: "Architecture", icon: Building2 },
  { href: "/configuration", label: "Configuration", icon: Settings },
  { href: "/shortcuts", label: "Shortcuts", icon: Keyboard },
  { href: "/loading-screen", label: "Loading", icon: Moon },
];

function filterEntries(entries: CommandPaletteEntry[], query: string): CommandPaletteEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) => e.label.toLowerCase().includes(q));
}

export function CommandPalette() {
  const router = useRouter();
  const { openShortcutsModal } = useQuickActions();
  const { theme: uiTheme, setTheme } = useUITheme();
  const refreshData = useRunStore((s) => s.refreshData);
  const clearTerminalOutputHistory = useRunStore((s) => s.clearTerminalOutputHistory);
  const removeTerminalOutputFromHistory = useRunStore((s) => s.removeTerminalOutputFromHistory);
  const terminalOutputHistory = useRunStore((s) => s.terminalOutputHistory);
  const terminalOutputHistoryLength = useRunStore((s) => s.terminalOutputHistory.length);
  const firstRunId = useRunStore((s) => s.terminalOutputHistory[0]?.id);
  const stopAllImplementAll = useRunStore((s) => s.stopAllImplementAll);
  const runningRuns = useRunStore((s) => s.runningRuns);
  const activeProjects = useRunStore((s) => s.activeProjects);
  const prompts = useRunStore((s) => s.prompts);
  const effectiveTheme = isValidUIThemeId(uiTheme) ? uiTheme : "light";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [clearRunHistoryConfirmOpen, setClearRunHistoryConfirmOpen] = useState(false);
  const [removeLastRunConfirmOpen, setRemoveLastRunConfirmOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load projects when palette opens so "Go to project" entries are available
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listProjects()
      .then((list) => {
        if (!cancelled) setProjects(list ?? []);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleRefreshData = useCallback(() => {
    refreshData().then(() => toast.success("Data refreshed")).catch(() => toast.error("Refresh failed"));
  }, [refreshData]);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const goToRun = useCallback(async () => {
    const active = activeProjects;
    if (!active.length) {
      toast.info("Select a project first");
      router.push("/projects");
      return;
    }
    const list = projects ?? (await listProjects().catch(() => []));
    const proj = list?.find((p) => p.repoPath === active[0]);
    if (!proj) {
      toast.info("Open a project first");
      router.push("/projects");
      return;
    }
    router.push(`/projects/${proj.id}?tab=worker`);
  }, [activeProjects, projects, router]);

  const goToTesting = useCallback(async () => {
    const active = activeProjects;
    if (!active.length) {
      toast.info("Select a project first");
      router.push("/projects");
      return;
    }
    const list = projects ?? (await listProjects().catch(() => []));
    const proj = list?.find((p) => p.repoPath === active[0]);
    if (!proj) {
      toast.info("Open a project first");
      router.push("/projects");
      return;
    }
    router.push(`/projects/${proj.id}?tab=worker`);
  }, [activeProjects, projects, router]);

  const goToMilestones = useCallback(async () => {
    const active = activeProjects;
    if (!active.length) {
      toast.info("Select a project first");
      router.push("/projects");
      return;
    }
    const list = projects ?? (await listProjects().catch(() => []));
    const proj = list?.find((p) => p.repoPath === active[0]);
    if (!proj) {
      toast.info("Open a project first");
      router.push("/projects");
      return;
    }
    router.push(`/projects/${proj.id}?tab=milestones`);
  }, [activeProjects, projects, router]);

  const goToVersioning = useCallback(() => {
    router.push("/versioning");
  }, [router]);

  const goToPlanner = useCallback(() => {
    router.push("/planner");
  }, [router]);

  const goToDesign = useCallback(() => {
    router.push("/design");
  }, [router]);

  const goToArchitecture = useCallback(() => {
    router.push("/architecture");
  }, [router]);

  const goToControl = useCallback(async () => {
    const active = activeProjects;
    if (!active.length) {
      toast.info("Select a project first");
      router.push("/projects");
      return;
    }
    const list = projects ?? (await listProjects().catch(() => []));
    const proj = list?.find((p) => p.repoPath === active[0]);
    if (!proj) {
      toast.info("Open a project first");
      router.push("/projects");
      return;
    }
    router.push(`/projects/${proj.id}?tab=control`);
  }, [activeProjects, projects, router]);

  const goToShortcuts = useCallback(() => {
    router.push("/shortcuts");
  }, [router]);

  const goToFirstProjectMilestones = useCallback(async () => {
    const active = activeProjects;
    if (!active.length) {
      toast.info("Select a project first");
      router.push("/projects");
      return;
    }
    const list = projects ?? (await listProjects().catch(() => []));
    const proj = list?.find((p) => p.repoPath === active[0]);
    if (!proj) {
      toast.info("Open a project first");
      router.push("/projects");
      return;
    }
    router.push(`/projects/${proj.id}?tab=milestones`);
  }, [activeProjects, projects, router]);

  const goToFirstProjectPlanner = useCallback(async () => {
    const active = activeProjects;
    if (!active.length) {
      toast.info("Select a project first");
      router.push("/projects");
      return;
    }
    const list = projects ?? (await listProjects().catch(() => []));
    const proj = list?.find((p) => p.repoPath === active[0]);
    if (!proj) {
      toast.info("Open a project first");
      router.push("/projects");
      return;
    }
    router.push(`/projects/${proj.id}?tab=todo`);
  }, [activeProjects, projects, router]);

  const goToFirstProject = useCallback(async () => {
    const active = activeProjects;
    if (!active.length) {
      toast.info("Select a project first");
      router.push("/projects");
      closePalette();
      return;
    }
    const list = projects ?? (await listProjects().catch(() => []));
    const proj = list?.find((p) => p.repoPath === active[0]);
    if (!proj) {
      toast.info("Open a project first");
      router.push("/projects");
      closePalette();
      return;
    }
    closePalette();
    router.push(`/projects/${proj.id}`);
  }, [activeProjects, projects, router, closePalette]);

  const handleCheckApiHealth = useCallback(async () => {
    try {
      const data = await getApiHealth();
      closePalette();
      const msg =
        data.ok && data.version
          ? `API health: OK (${data.version})`
          : "API health: OK";
      toast.success(msg);
    } catch {
      closePalette();
      toast.error("API health: Unavailable");
    }
  }, [closePalette]);

  const handleCopyAppInfo = useCallback(async () => {
    const version = await getAppVersion().catch(() => "—");
    const ok = await copyAppInfoToClipboard({ version, theme: effectiveTheme });
    if (ok) closePalette();
  }, [closePalette, effectiveTheme]);

  const handleCopyAppVersion = useCallback(async () => {
    const ok = await copyAppVersionToClipboard();
    if (ok) {
      toast.success("Version copied to clipboard");
      closePalette();
    } else {
      toast.error("Failed to copy version");
    }
  }, [closePalette]);

  const handleDownloadAppInfo = useCallback(async () => {
    const version = await getAppVersion().catch(() => "—");
    await downloadAppInfoAsMarkdown({ version, theme: effectiveTheme });
    closePalette();
  }, [closePalette, effectiveTheme]);

  const handleDownloadAppInfoJson = useCallback(async () => {
    const version = await getAppVersion().catch(() => "—");
    await downloadAppInfoAsJson({ version, theme: effectiveTheme });
    closePalette();
  }, [closePalette, effectiveTheme]);

  const handleCopyAppInfoAsMarkdown = useCallback(async () => {
    const version = await getAppVersion().catch(() => "—");
    await copyAppInfoAsMarkdownToClipboard({ version, theme: effectiveTheme });
    closePalette();
  }, [closePalette, effectiveTheme]);

  const handleCopyAppInfoAsJson = useCallback(async () => {
    const version = await getAppVersion().catch(() => "—");
    await copyAppInfoAsJsonToClipboard({ version, theme: effectiveTheme });
    closePalette();
  }, [closePalette, effectiveTheme]);

  const handleCopyCurrentPageUrl = useCallback(async () => {
    await copyCurrentPageUrlToClipboard();
    closePalette();
  }, [closePalette]);

  const handleDownloadProjectsListJson = useCallback(async () => {
    try {
      const list = await listProjects();
      downloadProjectsListAsJson(list ?? []);
      closePalette();
    } catch {
      toast.error("Failed to load projects");
      closePalette();
    }
  }, [closePalette]);

  const handleCopyProjectsListJson = useCallback(async () => {
    try {
      const list = await listProjects();
      await copyProjectsListAsJsonToClipboard(list ?? []);
      closePalette();
    } catch {
      toast.error("Failed to load projects");
      closePalette();
    }
  }, [closePalette]);

  const handleDownloadProjectsListCsv = useCallback(async () => {
    try {
      const list = await listProjects();
      downloadProjectsListAsCsv(list ?? []);
      closePalette();
    } catch {
      toast.error("Failed to load projects");
      closePalette();
    }
  }, [closePalette]);

  const handleCopyProjectsListCsv = useCallback(async () => {
    try {
      const list = await listProjects();
      await copyProjectsListAsCsvToClipboard(list ?? []);
      closePalette();
    } catch {
      toast.error("Failed to load projects");
      closePalette();
    }
  }, [closePalette]);

  const handleDownloadProjectsListMarkdown = useCallback(async () => {
    try {
      const list = await listProjects();
      downloadProjectsListAsMarkdown(list ?? []);
      closePalette();
    } catch {
      toast.error("Failed to load projects");
      closePalette();
    }
  }, [closePalette]);

  const handleCopyProjectsListMarkdown = useCallback(async () => {
    try {
      const list = await listProjects();
      await copyProjectsListAsMarkdownToClipboard(list ?? []);
      closePalette();
    } catch {
      toast.error("Failed to load projects");
      closePalette();
    }
  }, [closePalette]);

  const handleCopyActiveProjectsJson = useCallback(async () => {
    try {
      const list = await listProjects();
      await copyActiveProjectsAsJsonToClipboard(activeProjects, list ?? undefined);
      closePalette();
    } catch {
      toast.error("Failed to load projects");
      closePalette();
    }
  }, [activeProjects, closePalette]);

  const handleDownloadActiveProjectsJson = useCallback(async () => {
    try {
      const list = await listProjects();
      downloadActiveProjectsAsJson(activeProjects, list ?? undefined);
      closePalette();
    } catch {
      toast.error("Failed to load projects");
      closePalette();
    }
  }, [activeProjects, closePalette]);

  const handleCopyActiveProjectsCsv = useCallback(async () => {
    try {
      const list = await listProjects();
      await copyActiveProjectsAsCsvToClipboard(activeProjects, list ?? undefined);
      closePalette();
    } catch {
      toast.error("Failed to load projects");
      closePalette();
    }
  }, [activeProjects, closePalette]);

  const handleDownloadActiveProjectsCsv = useCallback(async () => {
    try {
      const list = await listProjects();
      downloadActiveProjectsAsCsv(activeProjects, list ?? undefined);
      closePalette();
    } catch {
      toast.error("Failed to load projects");
      closePalette();
    }
  }, [activeProjects, closePalette]);

  const promptsForExport = useMemo(
    () => prompts.map((p) => ({ id: p.id, title: p.title, content: p.content })),
    [prompts]
  );

  const handleCopyPrompts = useCallback(async () => {
    await copyAllPromptsAsMarkdownToClipboard(promptsForExport);
    closePalette();
  }, [promptsForExport, closePalette]);

  const handleDownloadPrompts = useCallback(() => {
    downloadAllPromptsAsMarkdown(promptsForExport);
    closePalette();
  }, [promptsForExport, closePalette]);

  const handleDownloadPromptsJson = useCallback(() => {
    downloadAllPromptsAsJson(promptsForExport);
    closePalette();
  }, [promptsForExport, closePalette]);

  const handleCopyPromptsJson = useCallback(async () => {
    await copyAllPromptsAsJsonToClipboard(promptsForExport);
    closePalette();
  }, [promptsForExport, closePalette]);

  const handleDownloadPromptsCsv = useCallback(() => {
    downloadAllPromptsAsCsv(promptsForExport);
    closePalette();
  }, [promptsForExport, closePalette]);

  const handleCopyPromptsCsv = useCallback(async () => {
    await copyAllPromptsAsCsvToClipboard(promptsForExport);
    closePalette();
  }, [promptsForExport, closePalette]);

  const handleDownloadCursorPromptsCsv = useCallback(async () => {
    await downloadAllCursorPromptsAsCsv();
    closePalette();
  }, [closePalette]);

  const handleCopyCursorPromptsCsv = useCallback(async () => {
    await copyAllCursorPromptsAsCsvToClipboard();
    closePalette();
  }, [closePalette]);

  const handleDownloadCursorPromptsJson = useCallback(async () => {
    await downloadAllCursorPromptsAsJson();
    closePalette();
  }, [closePalette]);

  const handleCopyCursorPromptsJson = useCallback(async () => {
    await copyAllCursorPromptsAsJsonToClipboard();
    closePalette();
  }, [closePalette]);

  const handleDownloadCursorPromptsMarkdown = useCallback(async () => {
    await downloadAllCursorPromptsAsMarkdown();
    closePalette();
  }, [closePalette]);

  const handleCopyCursorPromptsMarkdown = useCallback(async () => {
    await copyAllCursorPromptsAsMarkdownToClipboard();
    closePalette();
  }, [closePalette]);

  const handleOpenAppDataFolder = useCallback(async () => {
    await openAppDataFolderInFileManager();
    closePalette();
  }, [closePalette]);

  const handleCopyDataDirectoryPath = useCallback(async () => {
    await copyAppDataFolderPath();
    closePalette();
  }, [closePalette]);

  // Ideas, planner, and milestones folder handlers removed - now stored in database only

  const handleCopyFirstProjectPath = useCallback(async () => {
    const active = activeProjects;
    if (!active.length) {
      toast.info("Select a project first");
      closePalette();
      return;
    }
    const list = projects ?? (await listProjects().catch(() => []));
    const proj = list?.find((p) => p.repoPath === active[0]);
    if (!proj) {
      toast.info("Open a project first");
      closePalette();
      return;
    }
    if (!proj.repoPath?.trim()) {
      toast.info("No project path set");
      closePalette();
      return;
    }
    const ok = await copyTextToClipboard(proj.repoPath);
    if (ok) toast.success("Project path copied");
    closePalette();
  }, [activeProjects, projects, closePalette]);

  const handleCopyFirstProjectImplementationLog = useCallback(async () => {
    const active = activeProjects;
    if (!active.length) {
      toast.info("Select a project first");
      closePalette();
      return;
    }
    const list = projects ?? (await listProjects().catch(() => []));
    const proj = list?.find((p) => p.repoPath === active[0]);
    if (!proj) {
      toast.info("Open a project first");
      closePalette();
      return;
    }
    await copyImplementationLogToClipboard(proj.id);
    closePalette();
  }, [activeProjects, projects, closePalette]);

  const handleDownloadFirstProjectImplementationLog = useCallback(async () => {
    const active = activeProjects;
    if (!active.length) {
      toast.info("Select a project first");
      closePalette();
      return;
    }
    const list = projects ?? (await listProjects().catch(() => []));
    const proj = list?.find((p) => p.repoPath === active[0]);
    if (!proj) {
      toast.info("Open a project first");
      closePalette();
      return;
    }
    await downloadImplementationLog(proj.id);
    closePalette();
  }, [activeProjects, projects, closePalette]);

  const resolveFirstProject = useCallback(async (): Promise<{ id: string; designs: DesignRecord[]; architectures: ArchitectureRecord[] } | null> => {
    const active = activeProjects;
    if (!active.length) {
      toast.info("Select a project first");
      closePalette();
      return null;
    }
    const list = projects ?? (await listProjects().catch(() => []));
    const proj = list?.find((p) => p.repoPath === active[0]);
    if (!proj) {
      toast.info("Open a project first");
      closePalette();
      return null;
    }
    try {
      const resolved = await getProjectResolved(proj.id);
      const designs = (resolved.designs ?? []) as DesignRecord[];
      const architectures = (resolved.architectures ?? []) as ArchitectureRecord[];
      return { id: proj.id, designs, architectures };
    } catch {
      toast.error("Failed to load project");
      closePalette();
      return null;
    }
  }, [activeProjects, projects, closePalette]);

  const handleDownloadFirstProjectDesignsJson = useCallback(async () => {
    const data = await resolveFirstProject();
    if (!data) return;
    downloadProjectDesignsAsJson(data.designs);
    closePalette();
  }, [resolveFirstProject, closePalette]);

  const handleCopyFirstProjectDesignsJson = useCallback(async () => {
    const data = await resolveFirstProject();
    if (!data) return;
    await copyProjectDesignsAsJsonToClipboard(data.designs);
    closePalette();
  }, [resolveFirstProject, closePalette]);

  const handleDownloadFirstProjectDesignsMarkdown = useCallback(async () => {
    const data = await resolveFirstProject();
    if (!data) return;
    downloadProjectDesignsAsMarkdown(data.designs);
    closePalette();
  }, [resolveFirstProject, closePalette]);

  const handleCopyFirstProjectDesignsMarkdown = useCallback(async () => {
    const data = await resolveFirstProject();
    if (!data) return;
    await copyProjectDesignsAsMarkdownToClipboard(data.designs);
    closePalette();
  }, [resolveFirstProject, closePalette]);

  const handleDownloadFirstProjectArchitecturesJson = useCallback(async () => {
    const data = await resolveFirstProject();
    if (!data) return;
    downloadProjectArchitecturesAsJson(data.architectures);
    closePalette();
  }, [resolveFirstProject, closePalette]);

  const handleCopyFirstProjectArchitecturesJson = useCallback(async () => {
    const data = await resolveFirstProject();
    if (!data) return;
    await copyProjectArchitecturesAsJsonToClipboard(data.architectures);
    closePalette();
  }, [resolveFirstProject, closePalette]);

  const handleDownloadFirstProjectArchitecturesMarkdown = useCallback(async () => {
    const data = await resolveFirstProject();
    if (!data) return;
    downloadProjectArchitecturesAsMarkdown(data.architectures);
    closePalette();
  }, [resolveFirstProject, closePalette]);

  const handleCopyFirstProjectArchitecturesMarkdown = useCallback(async () => {
    const data = await resolveFirstProject();
    if (!data) return;
    await copyProjectArchitecturesAsMarkdownToClipboard(data.architectures);
    closePalette();
  }, [resolveFirstProject, closePalette]);

  const resolveFirstProjectTickets = useCallback(async (): Promise<{ projectName: string; tickets: ParsedTicket[] } | null> => {
    const active = activeProjects;
    if (!active.length) {
      toast.info("Select a project first");
      closePalette();
      return null;
    }
    const list = projects ?? (await listProjects().catch(() => []));
    const proj = list?.find((p) => p.repoPath === active[0]);
    if (!proj) {
      toast.info("Open a project first");
      closePalette();
      return null;
    }
    try {
      const { tickets } = await fetchProjectTicketsAndKanban(proj.id);
      return { projectName: proj.name ?? "Project", tickets };
    } catch {
      toast.error("Failed to load project tickets");
      closePalette();
      return null;
    }
  }, [activeProjects, projects, closePalette]);

  const handleDownloadFirstProjectTicketsJson = useCallback(async () => {
    const data = await resolveFirstProjectTickets();
    if (!data) return;
    downloadProjectTicketsAsJson(data.tickets);
    closePalette();
  }, [resolveFirstProjectTickets, closePalette]);

  const handleCopyFirstProjectTicketsJson = useCallback(async () => {
    const data = await resolveFirstProjectTickets();
    if (!data) return;
    await copyProjectTicketsAsJsonToClipboard(data.tickets);
    closePalette();
  }, [resolveFirstProjectTickets, closePalette]);

  const handleDownloadFirstProjectTicketsCsv = useCallback(async () => {
    const data = await resolveFirstProjectTickets();
    if (!data) return;
    downloadProjectTicketsAsCsv(data.tickets);
    closePalette();
  }, [resolveFirstProjectTickets, closePalette]);

  const handleCopyFirstProjectTicketsCsv = useCallback(async () => {
    const data = await resolveFirstProjectTickets();
    if (!data) return;
    await copyProjectTicketsAsCsvToClipboard(data.tickets);
    closePalette();
  }, [resolveFirstProjectTickets, closePalette]);

  const handleDownloadFirstProjectTicketsMarkdown = useCallback(async () => {
    const data = await resolveFirstProjectTickets();
    if (!data) return;
    downloadProjectTicketsAsMarkdown(data.tickets, { projectName: data.projectName });
    closePalette();
  }, [resolveFirstProjectTickets, closePalette]);

  const handleCopyFirstProjectTicketsMarkdown = useCallback(async () => {
    const data = await resolveFirstProjectTickets();
    if (!data) return;
    const ok = await copyProjectTicketsAsMarkdownToClipboard(data.tickets, { projectName: data.projectName });
    if (ok) toast.success("Tickets copied as Markdown");
    else toast.error("Failed to copy to clipboard");
    closePalette();
  }, [resolveFirstProjectTickets, closePalette]);

  const resolveFirstProjectMilestones = useCallback(async (): Promise<{ projectName: string; milestones: MilestoneRecord[] } | null> => {
    const active = activeProjects;
    if (!active.length) {
      toast.info("Select a project first");
      closePalette();
      return null;
    }
    const list = projects ?? (await listProjects().catch(() => []));
    const proj = list?.find((p) => p.repoPath === active[0]);
    if (!proj) {
      toast.info("Open a project first");
      closePalette();
      return null;
    }
    try {
      const milestones = await fetchProjectMilestones(proj.id);
      return { projectName: proj.name ?? "Project", milestones };
    } catch {
      toast.error("Failed to load project milestones");
      closePalette();
      return null;
    }
  }, [activeProjects, projects, closePalette]);

  const handleDownloadFirstProjectMilestonesJson = useCallback(async () => {
    const data = await resolveFirstProjectMilestones();
    if (!data) return;
    downloadProjectMilestonesAsJson(data.milestones);
    closePalette();
  }, [resolveFirstProjectMilestones, closePalette]);

  const handleCopyFirstProjectMilestonesJson = useCallback(async () => {
    const data = await resolveFirstProjectMilestones();
    if (!data) return;
    await copyProjectMilestonesAsJsonToClipboard(data.milestones);
    closePalette();
  }, [resolveFirstProjectMilestones, closePalette]);

  const handleDownloadFirstProjectMilestonesCsv = useCallback(async () => {
    const data = await resolveFirstProjectMilestones();
    if (!data) return;
    downloadProjectMilestonesAsCsv(data.milestones);
    closePalette();
  }, [resolveFirstProjectMilestones, closePalette]);

  const handleCopyFirstProjectMilestonesCsv = useCallback(async () => {
    const data = await resolveFirstProjectMilestones();
    if (!data) return;
    await copyProjectMilestonesAsCsvToClipboard(data.milestones);
    closePalette();
  }, [resolveFirstProjectMilestones, closePalette]);

  const handleDownloadFirstProjectMilestonesMarkdown = useCallback(async () => {
    const data = await resolveFirstProjectMilestones();
    if (!data) return;
    downloadProjectMilestonesAsMarkdown(data.milestones, { projectName: data.projectName });
    closePalette();
  }, [resolveFirstProjectMilestones, closePalette]);

  const handleCopyFirstProjectMilestonesMarkdown = useCallback(async () => {
    const data = await resolveFirstProjectMilestones();
    if (!data) return;
    await copyProjectMilestonesAsMarkdownToClipboard(data.milestones, { projectName: data.projectName });
    closePalette();
  }, [resolveFirstProjectMilestones, closePalette]);

  const handleDownloadFirstProjectTechStackJson = useCallback(async () => {
    if (!activeProjects.length) {
      toast.info("Select a project first");
      return;
    }
    const data = await fetchTechStackForProject(activeProjects[0]);
    if (!data) return;
    downloadTechStack(data);
    closePalette();
  }, [activeProjects, closePalette]);

  const handleCopyFirstProjectTechStackJson = useCallback(async () => {
    if (!activeProjects.length) {
      toast.info("Select a project first");
      return;
    }
    const data = await fetchTechStackForProject(activeProjects[0]);
    if (!data) return;
    await copyTechStackToClipboard(data);
    closePalette();
  }, [activeProjects, closePalette]);

  const handleDownloadFirstProjectTechStackMarkdown = useCallback(async () => {
    if (!activeProjects.length) {
      toast.info("Select a project first");
      return;
    }
    const data = await fetchTechStackForProject(activeProjects[0]);
    if (!data) return;
    downloadTechStackAsMarkdown(data);
    closePalette();
  }, [activeProjects, closePalette]);

  const handleCopyFirstProjectTechStackMarkdown = useCallback(async () => {
    if (!activeProjects.length) {
      toast.info("Select a project first");
      return;
    }
    const data = await fetchTechStackForProject(activeProjects[0]);
    if (!data) return;
    await copyTechStackAsMarkdownToClipboard(data);
    closePalette();
  }, [activeProjects, closePalette]);

  const handleDownloadFirstProjectTechStackCsv = useCallback(async () => {
    if (!activeProjects.length) {
      toast.info("Select a project first");
      return;
    }
    const data = await fetchTechStackForProject(activeProjects[0]);
    if (!data) return;
    downloadTechStackAsCsv(data);
    closePalette();
  }, [activeProjects, closePalette]);

  const handleCopyFirstProjectTechStackCsv = useCallback(async () => {
    if (!activeProjects.length) {
      toast.info("Select a project first");
      return;
    }
    const data = await fetchTechStackForProject(activeProjects[0]);
    if (!data) return;
    await copyTechStackAsCsvToClipboard(data);
    closePalette();
  }, [activeProjects, closePalette]);

  const handleClearRunHistory = useCallback(() => {
    closePalette();
    if (terminalOutputHistoryLength === 0) {
      toast.info("Run history is already empty");
      return;
    }
    setClearRunHistoryConfirmOpen(true);
  }, [closePalette, terminalOutputHistoryLength]);

  const handleConfirmClearRunHistory = useCallback(() => {
    clearTerminalOutputHistory();
    setClearRunHistoryConfirmOpen(false);
    toast.success("Run history cleared");
  }, [clearTerminalOutputHistory]);

  const handleRemoveLastRun = useCallback(() => {
    closePalette();
    if (firstRunId == null) {
      toast.info("No runs in history");
      return;
    }
    setRemoveLastRunConfirmOpen(true);
  }, [firstRunId, closePalette]);

  const handleConfirmRemoveLastRun = useCallback(() => {
    if (firstRunId == null) return;
    removeTerminalOutputFromHistory(firstRunId);
    setRemoveLastRunConfirmOpen(false);
    toast.success("Last run removed from history");
  }, [firstRunId, removeTerminalOutputFromHistory]);

  const handleRestoreRunHistoryFilters = useCallback(() => {
    closePalette();
    setRunHistoryPreferences(DEFAULT_RUN_HISTORY_PREFERENCES);
    window.dispatchEvent(new CustomEvent(RUN_HISTORY_PREFERENCES_RESTORED_EVENT));
    toast.success("Run history filters restored to defaults.");
  }, [closePalette]);

  const handleRestoreProjectsListFilters = useCallback(() => {
    closePalette();
    setProjectsListViewPreference(DEFAULT_PROJECTS_LIST_VIEW_PREFERENCE);
    window.dispatchEvent(new CustomEvent(PROJECTS_LIST_VIEW_PREFERENCE_RESTORED_EVENT));
    toast.success("Projects list filters restored to defaults.");
  }, [closePalette]);

  const handleOpenFirstProjectInCursor = useCallback(() => {
    if (!activeProjects.length) {
      toast.info("Select a project first");
      router.push("/projects");
      closePalette();
      return;
    }
    void openProjectInEditor(activeProjects[0], "cursor");
    closePalette();
  }, [activeProjects, router, closePalette]);

  const handleOpenFirstProjectInTerminal = useCallback(() => {
    if (!activeProjects.length) {
      toast.info("Select a project first");
      router.push("/projects");
      closePalette();
      return;
    }
    void openProjectInSystemTerminal(activeProjects[0]);
    closePalette();
  }, [activeProjects, router, closePalette]);

  const handleOpenFirstProjectInFileManager = useCallback(async () => {
    if (!activeProjects.length) {
      toast.info("Select a project first");
      router.push("/projects");
      closePalette();
      return;
    }
    const list = projects ?? (await listProjects().catch(() => []));
    const proj = list?.find((p) => p.repoPath === activeProjects[0]);
    if (!proj) {
      toast.info("Open a project first");
      closePalette();
      return;
    }
    await openProjectFolderInFileManager(proj.repoPath);
    closePalette();
  }, [activeProjects, projects, router, closePalette]);

  const handleOpenFirstProjectCursorFolder = useCallback(async () => {
    if (!activeProjects.length) {
      toast.info("Select a project first");
      router.push("/projects");
      closePalette();
      return;
    }
    const list = projects ?? (await listProjects().catch(() => []));
    const proj = list?.find((p) => p.repoPath === activeProjects[0]);
    if (!proj) {
      toast.info("Open a project first");
      closePalette();
      return;
    }
    await openProjectCursorFolderInFileManager(proj.repoPath);
    closePalette();
  }, [activeProjects, projects, router, closePalette]);

  const handleOpenFirstProjectRemoteInBrowser = useCallback(async () => {
    if (!activeProjects.length) {
      toast.info("Select a project first");
      router.push("/projects");
      closePalette();
      return;
    }
    if (!isTauri) {
      toast.info("Open first project's remote is available in the desktop app.");
      closePalette();
      return;
    }
    const list = projects ?? (await listProjects().catch(() => []));
    const proj = list?.find((p) => p.repoPath === activeProjects[0]);
    if (!proj) {
      toast.info("Open a project first");
      closePalette();
      return;
    }
    if (!proj.repoPath) {
      toast.info("This project has no repo path");
      closePalette();
      return;
    }
    try {
      const info = await invoke<GitInfo>("get_git_info", {
        projectPath: proj.repoPath.trim(),
      });
      const url = parseFirstRemoteUrl(info.remotes);
      if (!url) {
        toast.info("No remote URL for this project");
        closePalette();
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Opened remote in browser");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to get remote URL");
    }
    closePalette();
  }, [activeProjects, projects, router, closePalette]);

  const handleStopAllRuns = useCallback(async () => {
    if (runningRuns.length === 0) {
      toast.info("No runs in progress");
      closePalette();
      return;
    }
    try {
      await stopAllImplementAll();
      toast.success("All runs stopped");
    } catch {
      toast.error("Failed to stop runs");
    }
    closePalette();
  }, [stopAllImplementAll, runningRuns.length, closePalette]);

  const handleSwitchToLightMode = useCallback(() => {
    setTheme("light");
    toast.success("Switched to light mode");
    closePalette();
  }, [setTheme, closePalette]);

  const handleSwitchToDarkMode = useCallback(() => {
    setTheme("dark");
    toast.success("Switched to dark mode");
    closePalette();
  }, [setTheme, closePalette]);

  const handleCopyKeyboardShortcuts = useCallback(async () => {
    await copyKeyboardShortcutsAsMarkdownToClipboard();
    closePalette();
  }, [closePalette]);

  const handleCopyKeyboardShortcutsJson = useCallback(async () => {
    await copyKeyboardShortcutsAsJsonToClipboard();
    closePalette();
  }, [closePalette]);

  const handleCopyKeyboardShortcutsCsv = useCallback(async () => {
    await copyKeyboardShortcutsAsCsvToClipboard();
    closePalette();
  }, [closePalette]);

  const handleDownloadKeyboardShortcuts = useCallback(() => {
    downloadKeyboardShortcutsAsMarkdown();
    closePalette();
  }, [closePalette]);

  const handleDownloadKeyboardShortcutsJson = useCallback(() => {
    downloadKeyboardShortcutsAsJson();
    closePalette();
  }, [closePalette]);

  const handleDownloadKeyboardShortcutsCsv = useCallback(() => {
    downloadKeyboardShortcutsAsCsv();
    closePalette();
  }, [closePalette]);

  const handleCopyRunHistory = useCallback(() => {
    copyAllRunHistoryToClipboard(terminalOutputHistory);
    closePalette();
  }, [terminalOutputHistory, closePalette]);

  const handleCopyRunHistoryStatsSummary = useCallback(() => {
    copyRunHistoryStatsSummaryToClipboard(terminalOutputHistory);
    closePalette();
  }, [terminalOutputHistory, closePalette]);

  const handleDownloadRunHistoryStatsJson = useCallback(() => {
    downloadRunHistoryStatsAsJson(terminalOutputHistory);
    closePalette();
  }, [terminalOutputHistory, closePalette]);

  const handleCopyRunHistoryStatsJson = useCallback(async () => {
    await copyRunHistoryStatsAsJsonToClipboard(terminalOutputHistory);
    closePalette();
  }, [terminalOutputHistory, closePalette]);

  const handleDownloadRunHistoryStatsCsv = useCallback(() => {
    downloadRunHistoryStatsAsCsv(terminalOutputHistory);
    closePalette();
  }, [terminalOutputHistory, closePalette]);

  const handleCopyRunHistoryStatsCsv = useCallback(async () => {
    await copyRunHistoryStatsAsCsvToClipboard(terminalOutputHistory);
    closePalette();
  }, [terminalOutputHistory, closePalette]);

  const handleCopyRunHistoryJson = useCallback(async () => {
    await copyAllRunHistoryJsonToClipboard(terminalOutputHistory);
    closePalette();
  }, [terminalOutputHistory, closePalette]);

  const handleCopyRunHistoryMarkdown = useCallback(async () => {
    await copyAllRunHistoryMarkdownToClipboard(terminalOutputHistory);
    closePalette();
  }, [terminalOutputHistory, closePalette]);

  const handleCopyRunHistoryCsv = useCallback(async () => {
    await copyAllRunHistoryCsvToClipboard(terminalOutputHistory);
    closePalette();
  }, [terminalOutputHistory, closePalette]);

  const handleCopyLastRun = useCallback(() => {
    const lastRun = terminalOutputHistory[0];
    if (lastRun) {
      copySingleRunAsPlainTextToClipboard(lastRun);
    } else {
      toast.info("No run history to copy");
    }
    closePalette();
  }, [terminalOutputHistory, closePalette]);

  const handleDownloadLastRun = useCallback(() => {
    const lastRun = terminalOutputHistory[0];
    if (lastRun) {
      downloadSingleRunAsPlainText(lastRun);
    } else {
      toast.info("No run history to download");
    }
    closePalette();
  }, [terminalOutputHistory, closePalette]);

  const handleDownloadRunHistory = useCallback(() => {
    downloadAllRunHistory(terminalOutputHistory);
    closePalette();
  }, [terminalOutputHistory, closePalette]);

  const handleDownloadRunHistoryJson = useCallback(() => {
    downloadAllRunHistoryJson(terminalOutputHistory);
    closePalette();
  }, [terminalOutputHistory, closePalette]);

  const handleDownloadRunHistoryMarkdown = useCallback(() => {
    downloadAllRunHistoryMarkdown(terminalOutputHistory);
    closePalette();
  }, [terminalOutputHistory, closePalette]);

  const handleDownloadRunHistoryCsv = useCallback(() => {
    downloadAllRunHistoryCsv(terminalOutputHistory);
    closePalette();
  }, [terminalOutputHistory, closePalette]);

  const actionEntries: CommandPaletteEntry[] = useMemo(() => {
    const entries: CommandPaletteEntry[] = [
      { label: "Refresh data", icon: RefreshCw, onSelect: handleRefreshData },
      { label: "Reload app", icon: RotateCw, onSelect: () => { closePalette(); window.location.reload(); } },
      { label: "Go to Run", icon: Activity, onSelect: () => { goToRun(); closePalette(); } },
      { label: "Go to Testing", icon: TestTube2, onSelect: () => { goToTesting(); closePalette(); } },
      { label: "Go to Milestones", icon: Flag, onSelect: () => { goToMilestones(); closePalette(); } },
      { label: "Go to Versioning", icon: FolderGit2, onSelect: () => { goToVersioning(); closePalette(); } },
      { label: "Go to Planner", icon: ListTodo, onSelect: () => { goToPlanner(); closePalette(); } },
      { label: "Go to Design", icon: Palette, onSelect: () => { goToDesign(); closePalette(); } },
      { label: "Go to Architecture", icon: Building2, onSelect: () => { goToArchitecture(); closePalette(); } },
      { label: "Go to Control", icon: ClipboardList, onSelect: () => { goToControl(); closePalette(); } },
      { label: "Go to Shortcuts", icon: Keyboard, onSelect: () => { goToShortcuts(); closePalette(); } },
      { label: "Go to Analyzer", icon: ScanSearch, onSelect: () => { router.push("/app-analyzer"); closePalette(); } },
      { label: "Go to first project Milestones", icon: Flag, onSelect: () => { goToFirstProjectMilestones(); closePalette(); } },
      { label: "Go to first project Planner", icon: ListTodo, onSelect: () => { goToFirstProjectPlanner(); closePalette(); } },
      { label: "Go to first project", icon: FolderOpen, onSelect: goToFirstProject },
      { label: "Open first project in Cursor", icon: Code2, onSelect: handleOpenFirstProjectInCursor },
      { label: "Open first project in Terminal", icon: Terminal, onSelect: handleOpenFirstProjectInTerminal },
      { label: "Open first project in file manager", icon: Folder, onSelect: handleOpenFirstProjectInFileManager },
      { label: "Open first project's .cursor folder", icon: FolderCog, onSelect: handleOpenFirstProjectCursorFolder },
      { label: "Open first project's remote in browser", icon: ExternalLink, onSelect: handleOpenFirstProjectRemoteInBrowser },
      { label: "Stop all runs", icon: Square, onSelect: handleStopAllRuns },
      { label: "Clear run history", icon: Trash2, onSelect: handleClearRunHistory },
      { label: "Remove last run from history", icon: Trash2, onSelect: handleRemoveLastRun },
      { label: "Restore run history filters", icon: RotateCcw, onSelect: handleRestoreRunHistoryFilters },
      { label: "Restore projects list filters", icon: RotateCcw, onSelect: handleRestoreProjectsListFilters },
      { label: "Switch to light mode", icon: Sun, onSelect: handleSwitchToLightMode },
      { label: "Switch to dark mode", icon: Moon, onSelect: handleSwitchToDarkMode },
      { label: "Keyboard shortcuts", icon: Keyboard, onSelect: openShortcutsModal },
      { label: "Copy app info", icon: ClipboardList, onSelect: handleCopyAppInfo },
      { label: "Copy app version", icon: Copy, onSelect: handleCopyAppVersion },
      { label: "Copy app info as Markdown", icon: FileText, onSelect: handleCopyAppInfoAsMarkdown },
      { label: "Copy app info as JSON", icon: FileJson, onSelect: handleCopyAppInfoAsJson },
      { label: "Download app info", icon: Download, onSelect: handleDownloadAppInfo },
      { label: "Download app info as JSON", icon: FileJson, onSelect: handleDownloadAppInfoJson },
      { label: "Copy first project path", icon: Copy, onSelect: handleCopyFirstProjectPath },
      { label: "Copy first project implementation log", icon: ClipboardList, onSelect: handleCopyFirstProjectImplementationLog },
      { label: "Download first project implementation log", icon: Download, onSelect: handleDownloadFirstProjectImplementationLog },
      { label: "Download first project designs as JSON", icon: FileJson, onSelect: handleDownloadFirstProjectDesignsJson },
      { label: "Copy first project designs as JSON", icon: FileJson, onSelect: handleCopyFirstProjectDesignsJson },
      { label: "Download first project designs as Markdown", icon: FileText, onSelect: handleDownloadFirstProjectDesignsMarkdown },
      { label: "Copy first project designs as Markdown", icon: FileText, onSelect: handleCopyFirstProjectDesignsMarkdown },
      { label: "Download first project architectures as JSON", icon: FileJson, onSelect: handleDownloadFirstProjectArchitecturesJson },
      { label: "Copy first project architectures as JSON", icon: FileJson, onSelect: handleCopyFirstProjectArchitecturesJson },
      { label: "Download first project architectures as Markdown", icon: FileText, onSelect: handleDownloadFirstProjectArchitecturesMarkdown },
      { label: "Copy first project architectures as Markdown", icon: FileText, onSelect: handleCopyFirstProjectArchitecturesMarkdown },
      { label: "Download first project tickets as JSON", icon: FileJson, onSelect: handleDownloadFirstProjectTicketsJson },
      { label: "Copy first project tickets as JSON", icon: FileJson, onSelect: handleCopyFirstProjectTicketsJson },
      { label: "Download first project tickets as CSV", icon: FileSpreadsheet, onSelect: handleDownloadFirstProjectTicketsCsv },
      { label: "Copy first project tickets as CSV", icon: FileSpreadsheet, onSelect: handleCopyFirstProjectTicketsCsv },
      { label: "Download first project tickets as Markdown", icon: FileText, onSelect: handleDownloadFirstProjectTicketsMarkdown },
      { label: "Copy first project tickets as Markdown", icon: FileText, onSelect: handleCopyFirstProjectTicketsMarkdown },
      { label: "Download first project milestones as JSON", icon: FileJson, onSelect: handleDownloadFirstProjectMilestonesJson },
      { label: "Copy first project milestones as JSON", icon: FileJson, onSelect: handleCopyFirstProjectMilestonesJson },
      { label: "Download first project milestones as CSV", icon: FileSpreadsheet, onSelect: handleDownloadFirstProjectMilestonesCsv },
      { label: "Copy first project milestones as CSV", icon: FileSpreadsheet, onSelect: handleCopyFirstProjectMilestonesCsv },
      { label: "Download first project milestones as Markdown", icon: FileText, onSelect: handleDownloadFirstProjectMilestonesMarkdown },
      { label: "Copy first project milestones as Markdown", icon: FileText, onSelect: handleCopyFirstProjectMilestonesMarkdown },
      { label: "Download first project tech stack as JSON", icon: FileJson, onSelect: handleDownloadFirstProjectTechStackJson },
      { label: "Copy first project tech stack as JSON", icon: FileJson, onSelect: handleCopyFirstProjectTechStackJson },
      { label: "Download first project tech stack as Markdown", icon: FileText, onSelect: handleDownloadFirstProjectTechStackMarkdown },
      { label: "Copy first project tech stack as Markdown", icon: FileText, onSelect: handleCopyFirstProjectTechStackMarkdown },
      { label: "Download first project tech stack as CSV", icon: FileSpreadsheet, onSelect: handleDownloadFirstProjectTechStackCsv },
      { label: "Copy first project tech stack as CSV", icon: FileSpreadsheet, onSelect: handleCopyFirstProjectTechStackCsv },
      { label: "Copy data directory path", icon: Copy, onSelect: handleCopyDataDirectoryPath },
      { label: "Copy keyboard shortcuts", icon: Copy, onSelect: handleCopyKeyboardShortcuts },
      { label: "Copy keyboard shortcuts as JSON", icon: FileJson, onSelect: handleCopyKeyboardShortcutsJson },
      { label: "Copy keyboard shortcuts as CSV", icon: FileSpreadsheet, onSelect: handleCopyKeyboardShortcutsCsv },
      { label: "Download keyboard shortcuts", icon: Download, onSelect: handleDownloadKeyboardShortcuts },
      { label: "Download keyboard shortcuts as JSON", icon: FileJson, onSelect: handleDownloadKeyboardShortcutsJson },
      { label: "Download keyboard shortcuts as CSV", icon: FileSpreadsheet, onSelect: handleDownloadKeyboardShortcutsCsv },
      { label: "Copy run history to clipboard", icon: Copy, onSelect: handleCopyRunHistory },
      { label: "Copy run history stats summary", icon: Copy, onSelect: handleCopyRunHistoryStatsSummary },
      { label: "Download run history stats as JSON", icon: FileJson, onSelect: handleDownloadRunHistoryStatsJson },
      { label: "Copy run history stats as JSON", icon: FileJson, onSelect: handleCopyRunHistoryStatsJson },
      { label: "Download run history stats as CSV", icon: FileSpreadsheet, onSelect: handleDownloadRunHistoryStatsCsv },
      { label: "Copy run history stats as CSV", icon: FileSpreadsheet, onSelect: handleCopyRunHistoryStatsCsv },
      { label: "Copy run history as JSON", icon: FileJson, onSelect: handleCopyRunHistoryJson },
      { label: "Copy run history as Markdown", icon: FileText, onSelect: handleCopyRunHistoryMarkdown },
      { label: "Copy run history as CSV", icon: FileSpreadsheet, onSelect: handleCopyRunHistoryCsv },
      { label: "Copy last run to clipboard", icon: Copy, onSelect: handleCopyLastRun },
      { label: "Download last run as file", icon: Download, onSelect: handleDownloadLastRun },
      { label: "Download run history", icon: Download, onSelect: handleDownloadRunHistory },
      { label: "Download run history as JSON", icon: FileJson, onSelect: handleDownloadRunHistoryJson },
      { label: "Download run history as Markdown", icon: FileText, onSelect: handleDownloadRunHistoryMarkdown },
      { label: "Download run history as CSV", icon: FileSpreadsheet, onSelect: handleDownloadRunHistoryCsv },
      { label: "Open data folder", icon: HardDrive, onSelect: handleOpenAppDataFolder },
      { label: "Copy current page URL", icon: Link, onSelect: handleCopyCurrentPageUrl },
      { label: "Copy prompts", icon: Copy, onSelect: handleCopyPrompts },
      { label: "Download prompts", icon: Download, onSelect: handleDownloadPrompts },
      { label: "Download prompts as JSON", icon: FileJson, onSelect: handleDownloadPromptsJson },
      { label: "Copy prompts as JSON", icon: FileJson, onSelect: handleCopyPromptsJson },
      { label: "Download prompts as CSV", icon: FileSpreadsheet, onSelect: handleDownloadPromptsCsv },
      { label: "Copy prompts as CSV", icon: FileSpreadsheet, onSelect: handleCopyPromptsCsv },
      { label: "Download .cursor prompts as CSV", icon: FileSpreadsheet, onSelect: handleDownloadCursorPromptsCsv },
      { label: "Copy .cursor prompts as CSV", icon: FileSpreadsheet, onSelect: handleCopyCursorPromptsCsv },
      { label: "Download .cursor prompts as JSON", icon: FileJson, onSelect: handleDownloadCursorPromptsJson },
      { label: "Copy .cursor prompts as JSON", icon: FileJson, onSelect: handleCopyCursorPromptsJson },
      { label: "Download .cursor prompts as Markdown", icon: FileText, onSelect: handleDownloadCursorPromptsMarkdown },
      { label: "Copy .cursor prompts as Markdown", icon: FileText, onSelect: handleCopyCursorPromptsMarkdown },
      { label: "Download projects list as JSON", icon: FileJson, onSelect: handleDownloadProjectsListJson },
      { label: "Copy projects list as JSON", icon: FileJson, onSelect: handleCopyProjectsListJson },
      { label: "Download projects list as CSV", icon: FileSpreadsheet, onSelect: handleDownloadProjectsListCsv },
      { label: "Copy projects list as CSV", icon: FileSpreadsheet, onSelect: handleCopyProjectsListCsv },
      { label: "Download projects list as Markdown", icon: FileText, onSelect: handleDownloadProjectsListMarkdown },
      { label: "Copy projects list as Markdown", icon: FileText, onSelect: handleCopyProjectsListMarkdown },
      { label: "Download active projects as JSON", icon: FileJson, onSelect: handleDownloadActiveProjectsJson },
      { label: "Copy active projects as JSON", icon: FileJson, onSelect: handleCopyActiveProjectsJson },
      { label: "Download active projects as CSV", icon: FileSpreadsheet, onSelect: handleDownloadActiveProjectsCsv },
      { label: "Copy active projects as CSV", icon: FileSpreadsheet, onSelect: handleCopyActiveProjectsCsv },
      { label: "Discover folders", icon: FolderSearch, onSelect: () => { router.push("/projects?discover=1"); closePalette(); } },
      { label: "Print current page", icon: Printer, onSelect: () => { window.print(); closePalette(); } },
      { label: "Toggle sidebar", icon: PanelLeft, onSelect: () => { dispatchSidebarToggle(); closePalette(); } },
      { label: "Scroll to top", icon: ChevronUp, onSelect: () => { const main = document.getElementById("main-content"); if (main) main.scrollTop = 0; closePalette(); } },
      { label: "Scroll to bottom", icon: ChevronDown, onSelect: () => { const main = document.getElementById("main-content"); if (main) main.scrollTop = main.scrollHeight - main.clientHeight; closePalette(); } },
      { label: "Focus main content", icon: Focus, onSelect: () => { document.getElementById("main-content")?.focus(); closePalette(); } },
      { label: "Focus filter", icon: Search, onSelect: () => { dispatchFocusFilterEvent(); closePalette(); } },
    ];
    const repoUrl = getAppRepositoryUrl();
    if (repoUrl) {
      entries.push({
        label: "Copy repository URL",
        icon: Copy,
        onSelect: async () => {
          const ok = await copyTextToClipboard(repoUrl);
          if (ok) toast.success("Repository URL copied to clipboard");
          else toast.error("Failed to copy to clipboard");
          closePalette();
        },
      });
      entries.push({
        label: "View source",
        icon: ExternalLink,
        onSelect: () => {
          window.open(repoUrl, "_blank", "noopener,noreferrer");
          closePalette();
        },
      });
    }
    if (!isTauri) {
      entries.push({
        label: "Check API health",
        icon: Activity,
        onSelect: handleCheckApiHealth,
      });
    }
    return entries;
  }, [handleRefreshData, goToRun, goToTesting, goToMilestones, goToVersioning, goToPlanner, goToDesign, goToArchitecture, goToControl, goToShortcuts, goToFirstProjectMilestones, goToFirstProjectPlanner, goToFirstProject, closePalette, openShortcutsModal, handleClearRunHistory, handleRemoveLastRun, handleRestoreRunHistoryFilters, handleRestoreProjectsListFilters, handleSwitchToLightMode, handleSwitchToDarkMode, handleOpenFirstProjectInCursor, handleOpenFirstProjectInTerminal, handleOpenFirstProjectInFileManager, handleOpenFirstProjectCursorFolder, handleOpenFirstProjectRemoteInBrowser, handleStopAllRuns, handleCheckApiHealth, handleCopyAppInfo, handleCopyAppVersion, handleCopyAppInfoAsMarkdown, handleCopyAppInfoAsJson, handleDownloadAppInfo, handleDownloadAppInfoJson, handleCopyFirstProjectPath, handleCopyFirstProjectImplementationLog, handleDownloadFirstProjectImplementationLog, handleDownloadFirstProjectDesignsJson, handleCopyFirstProjectDesignsJson, handleDownloadFirstProjectDesignsMarkdown, handleCopyFirstProjectDesignsMarkdown, handleDownloadFirstProjectArchitecturesJson, handleCopyFirstProjectArchitecturesJson, handleDownloadFirstProjectArchitecturesMarkdown, handleCopyFirstProjectArchitecturesMarkdown, handleDownloadFirstProjectTicketsJson, handleCopyFirstProjectTicketsJson, handleDownloadFirstProjectTicketsCsv, handleCopyFirstProjectTicketsCsv, handleDownloadFirstProjectTicketsMarkdown, handleCopyFirstProjectTicketsMarkdown, handleDownloadFirstProjectMilestonesJson, handleCopyFirstProjectMilestonesJson, handleDownloadFirstProjectMilestonesCsv, handleCopyFirstProjectMilestonesCsv, handleDownloadFirstProjectMilestonesMarkdown, handleCopyFirstProjectMilestonesMarkdown, handleDownloadFirstProjectTechStackJson, handleCopyFirstProjectTechStackJson, handleDownloadFirstProjectTechStackMarkdown, handleCopyFirstProjectTechStackMarkdown, handleDownloadFirstProjectTechStackCsv, handleCopyFirstProjectTechStackCsv, handleCopyDataDirectoryPath, handleCopyKeyboardShortcuts, handleCopyKeyboardShortcutsJson, handleCopyKeyboardShortcutsCsv, handleDownloadKeyboardShortcuts, handleDownloadKeyboardShortcutsJson, handleDownloadKeyboardShortcutsCsv, handleCopyRunHistory, handleCopyRunHistoryStatsSummary, handleDownloadRunHistoryStatsJson, handleCopyRunHistoryStatsJson, handleDownloadRunHistoryStatsCsv, handleCopyRunHistoryStatsCsv, handleCopyRunHistoryJson, handleCopyRunHistoryMarkdown, handleCopyRunHistoryCsv, handleCopyLastRun, handleDownloadLastRun, handleDownloadRunHistory, handleDownloadRunHistoryJson, handleDownloadRunHistoryMarkdown, handleDownloadRunHistoryCsv, handleOpenAppDataFolder, handleCopyCurrentPageUrl, handleCopyPrompts, handleDownloadPrompts, handleDownloadPromptsJson, handleCopyPromptsJson, handleDownloadPromptsCsv, handleCopyPromptsCsv, handleDownloadCursorPromptsCsv, handleCopyCursorPromptsCsv, handleDownloadCursorPromptsJson, handleCopyCursorPromptsJson, handleDownloadCursorPromptsMarkdown, handleCopyCursorPromptsMarkdown, handleDownloadProjectsListJson, handleCopyProjectsListJson, handleDownloadProjectsListCsv, handleCopyProjectsListCsv, handleDownloadProjectsListMarkdown, handleCopyProjectsListMarkdown, handleDownloadActiveProjectsJson, handleCopyActiveProjectsJson, handleDownloadActiveProjectsCsv, handleCopyActiveProjectsCsv]);
  const projectEntries: CommandPaletteEntry[] = useMemo(() => {
    if (!projects || projects.length === 0) return [];
    const recentIds = getRecentProjectIds();
    const byRecentFirst = [...projects].sort((a, b) => {
      const ai = recentIds.indexOf(a.id);
      const bi = recentIds.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return byRecentFirst.map((p) => ({
      href: `/projects/${p.id}`,
      label: p.name,
      icon: FolderOpen as React.ComponentType<{ className?: string }>,
    }));
  }, [projects]);
  const allEntries = useMemo(
    () => [...actionEntries, ...projectEntries, ...NAV_ENTRIES],
    [actionEntries, projectEntries]
  );

  const filtered = filterEntries(allEntries, query);
  const selectedEntry = filtered[selectedIndex] ?? null;

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openPalette();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openPalette]);

  // Go to Dashboard: ⌘⇧H (Mac) / Ctrl+Alt+D (Windows/Linux); skip when palette open or focus in input/textarea/select
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const goDashboard =
        isMac ? e.metaKey && e.shiftKey && e.key === "H" : e.ctrlKey && e.altKey && e.key === "d";
      if (goDashboard) {
        e.preventDefault();
        router.push("/");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, router]);

  // Go to Projects: ⌘⇧P (Mac) / Ctrl+Alt+P (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const goProjects =
        isMac ? e.metaKey && e.shiftKey && e.key === "P" : e.ctrlKey && e.altKey && e.key === "p";
      if (goProjects) {
        e.preventDefault();
        router.push("/projects");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, router]);

  // Go to Prompts: ⌘⇧M (Mac) / Ctrl+Alt+M (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const goPrompts =
        isMac ? e.metaKey && e.shiftKey && e.key === "M" : e.ctrlKey && e.altKey && e.key === "m";
      if (goPrompts) {
        e.preventDefault();
        router.push("/prompts");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, router]);

  // Go to Configuration: ⌘⇧O (Mac) / Ctrl+Alt+O (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const goConfig =
        isMac ? e.metaKey && e.shiftKey && e.key === "O" : e.ctrlKey && e.altKey && e.key === "o";
      if (goConfig) {
        e.preventDefault();
        router.push("/configuration");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, router]);

  // Go to Loading: ⌘⇧L (Mac) / Ctrl+Alt+L (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const goLoading =
        isMac ? e.metaKey && e.shiftKey && e.key === "L" : e.ctrlKey && e.altKey && e.key === "l";
      if (goLoading) {
        e.preventDefault();
        router.push("/loading-screen");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, router]);

  // Go to New project: ⌘⇧N (Mac) / Ctrl+Alt+N (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const goNewProject =
        isMac ? e.metaKey && e.shiftKey && e.key === "N" : e.ctrlKey && e.altKey && e.key === "n";
      if (goNewProject) {
        e.preventDefault();
        router.push("/projects/new");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, router]);

  // Go to Run: ⌘⇧W (Mac) / Ctrl+Alt+W (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const goRun =
        isMac ? e.metaKey && e.shiftKey && e.key === "W" : e.ctrlKey && e.altKey && e.key === "w";
      if (goRun) {
        e.preventDefault();
        goToRun();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, goToRun]);

  // Go to Testing: ⌘⇧Y (Mac) / Ctrl+Alt+Y (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const goTesting =
        isMac ? e.metaKey && e.shiftKey && e.key === "Y" : e.ctrlKey && e.altKey && e.key === "y";
      if (goTesting) {
        e.preventDefault();
        goToTesting();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, goToTesting]);

  // Go to Milestones: ⌘⇧V (Mac) / Ctrl+Alt+V (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const goMilestones =
        isMac ? e.metaKey && e.shiftKey && e.key === "V" : e.ctrlKey && e.altKey && e.key === "v";
      if (goMilestones) {
        e.preventDefault();
        goToMilestones();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, goToMilestones]);

  // Go to Versioning: ⌘⇧U (Mac) / Ctrl+Alt+U (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const goVersioning =
        isMac ? e.metaKey && e.shiftKey && e.key === "U" : e.ctrlKey && e.altKey && e.key === "u";
      if (goVersioning) {
        e.preventDefault();
        goToVersioning();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, goToVersioning]);

  // Go to Planner: ⌘⇧J (Mac) / Ctrl+Alt+J (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const goPlanner =
        isMac ? e.metaKey && e.shiftKey && e.key === "J" : e.ctrlKey && e.altKey && e.key === "j";
      if (goPlanner) {
        e.preventDefault();
        goToPlanner();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, goToPlanner]);

  // Go to Control: ⌘⇧C (Mac) / Ctrl+Alt+C (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const goControl =
        isMac ? e.metaKey && e.shiftKey && e.key === "C" : e.ctrlKey && e.altKey && e.key === "c";
      if (goControl) {
        e.preventDefault();
        goToControl();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, goToControl]);

  // Go to Design: ⌘⇧X (Mac) / Ctrl+Alt+X (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const goDesign =
        isMac ? e.metaKey && e.shiftKey && e.key === "X" : e.ctrlKey && e.altKey && e.key === "x";
      if (goDesign) {
        e.preventDefault();
        goToDesign();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, goToDesign]);

  // Go to Architecture: ⌘⇧A (Mac) / Ctrl+Alt+A (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const goArchitecture =
        isMac ? e.metaKey && e.shiftKey && e.key === "A" : e.ctrlKey && e.altKey && e.key === "a";
      if (goArchitecture) {
        e.preventDefault();
        goToArchitecture();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, goToArchitecture]);

  // Go to Shortcuts: ⌘⇧S (Mac) / Ctrl+Alt+S (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const goShortcuts =
        isMac ? e.metaKey && e.shiftKey && e.key === "S" : e.ctrlKey && e.altKey && e.key === "s";
      if (goShortcuts) {
        e.preventDefault();
        goToShortcuts();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, goToShortcuts]);

  // Focus main content: ⌘⇧F (Mac) / Ctrl+Alt+F (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const focusMain =
        isMac ? e.metaKey && e.shiftKey && e.key === "F" : e.ctrlKey && e.altKey && e.key === "f";
      if (focusMain) {
        e.preventDefault();
        document.getElementById("main-content")?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Focus filter (global): ⌘⇧/ (Mac) / Ctrl+Alt+/ (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const focusFilter =
        isMac ? e.metaKey && e.shiftKey && e.key === "/" : e.ctrlKey && e.altKey && e.key === "/";
      if (focusFilter) {
        e.preventDefault();
        dispatchFocusFilterEvent();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Refresh data: ⌘⇧R (Mac) / Ctrl+Alt+R (Windows/Linux); same guards as Dashboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const refreshDataShortcut =
        isMac ? e.metaKey && e.shiftKey && e.key === "R" : e.ctrlKey && e.altKey && e.key === "r";
      if (refreshDataShortcut) {
        e.preventDefault();
        handleRefreshData();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleRefreshData]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Keep selected index in bounds when filter changes
  useEffect(() => {
    setSelectedIndex((i) => (filtered.length ? Math.min(i, filtered.length - 1) : 0));
  }, [filtered.length]);

  const selectEntry = useCallback(
    (entry: CommandPaletteEntry) => {
      if (entry.onSelect) {
        entry.onSelect();
        closePalette();
      } else if (entry.href) {
        router.push(entry.href);
        closePalette();
      }
    },
    [router, closePalette]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closePalette();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
        return;
      }
      if (e.key === "Enter" && selectedEntry) {
        e.preventDefault();
        selectEntry(selectedEntry);
      }
    },
    [open, closePalette, filtered.length, selectedEntry, selectEntry]
  );

  return (
    <>
      <CommandPaletteAnnouncer open={open} />
      <Dialog open={clearRunHistoryConfirmOpen} onOpenChange={setClearRunHistoryConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear run history?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {terminalOutputHistoryLength === 1
              ? "1 run will be removed from history. This cannot be undone."
              : `${terminalOutputHistoryLength} runs will be removed from history. This cannot be undone.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearRunHistoryConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmClearRunHistory}
            >
              Clear history
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={removeLastRunConfirmOpen} onOpenChange={setRemoveLastRunConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove last run from history?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The most recent run will be removed. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveLastRunConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemoveLastRun}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && closePalette()}>
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-2 border-b border-border flex items-center gap-1">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search pages and projects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 h-9 flex-1"
            aria-label="Search command palette"
          />
          {query.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[min(60vh,320px)]">
          <div className="p-1 pb-2" role="listbox" aria-label="Navigation targets">
            {projects === null && (
              <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground" role="status" aria-live="polite">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                <span>Loading projects…</span>
              </div>
            )}
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No matching pages.</div>
            ) : (
              filtered.map((entry, i) => {
                const isSelected = i === selectedIndex;
                const key = "href" in entry && entry.href ? entry.href + entry.label : "action-" + entry.label;
                return (
                  <button
                    key={key}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-muted/70"
                    )}
                    onClick={() => selectEntry(entry)}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    <entry.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{entry.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
        <div className="px-3 py-2 border-t border-border bg-muted/30 text-[10px] text-muted-foreground flex items-center gap-4">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
