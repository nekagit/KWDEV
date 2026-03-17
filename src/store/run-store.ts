"use client";

/**
 * Zustand run store: terminal runs, projects list, queue, night-shift, and Tauri integration.
 * Hydrated by RunStoreHydration; consumed by run tab, worker, and layout.
 */
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { invoke, isTauri, runRunTerminalAgentPayload } from "@/lib/tauri";
import { STATIC_ANALYSIS_CHECKLIST } from "@/lib/static-analysis-checklist";
import { isImplementAllRun, getNextFreeSlotOrNull } from "@/lib/run-helpers";
import { debugIngest } from "@/lib/debug-ingest";
import { getApiErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import {
  DEFAULT_TIMING,
  type Timing,
  type PromptRecordItem,
  type RunInfo,
  type RunMeta,
  type TerminalOutputHistoryEntry,
  type NightShiftCirclePhase,
} from "@/types/run";

export interface RunState {
  isTauriEnv: boolean | null;
  loading: boolean;
  error: string | null;
  /** Non-fatal message when API returns 200 but data dir missing (browser). */
  dataWarning: string | null;
  allProjects: string[];
  activeProjects: string[];
  prompts: PromptRecordItem[];
  selectedPromptRecordIds: number[];
  timing: Timing;
  runningRuns: RunInfo[];
  selectedRunId: string | null;
  /** Queue of temp-ticket jobs (fast dev, debug) waiting for a free terminal slot. */
  pendingTempTicketQueue: PendingTempTicketJob[];

  /** Archived Implement All logs (saved when user clicks Archive). */
  archivedImplementAllLogs: Array<{ id: string; timestamp: string; logLines: string[] }>;
  /** Run ID currently shown in the floating terminal dialog (Setup prompt runs). */
  floatingTerminalRunId: string | null;
  /** Whether the floating terminal is minimized (pill); false = expanded. */
  floatingTerminalMinimized: boolean;
  /** History of agent terminal outputs (completed runs). Newest first; capped at TERMINAL_HISTORY_MAX. */
  terminalOutputHistory: TerminalOutputHistoryEntry[];
  /** Night shift: 3 agents run same prompt in a loop until stopped. */
  nightShiftActive: boolean;
  /** Called when a night-shift run exits to enqueue one more job (replenish). Receives slot and optionally the exiting run (for Circle phase logic). */
  nightShiftReplenishCallback: ((slot: 1 | 2 | 3, exitingRun?: RunInfo | null) => Promise<void>) | null;
  /** Night shift Circle: mode on/off, current phase, completed count in current phase (0–3). */
  nightShiftCircleMode: boolean;
  nightShiftCirclePhase: NightShiftCirclePhase | null;
  nightShiftCircleCompletedInPhase: number;
  /** Night shift Idea-driven: one idea at a time, circle (Create→…→Refactor) per ticket in normal agent mode. */
  nightShiftIdeaDrivenMode: boolean;
  nightShiftIdeaDrivenIdea: { id: number; title: string; description?: string } | null;
  nightShiftIdeaDrivenTickets: Array<{ id: string; number: number; title: string; description?: string; priority: string; featureName?: string; agents?: string[]; milestoneId?: number; ideaId?: number }>;
  nightShiftIdeaDrivenTicketIndex: number;
  nightShiftIdeaDrivenPhase: NightShiftCirclePhase | null;
  nightShiftIdeaDrivenCompletedInPhase: number;
  /** Remaining ideas to process (id, title, description). */
  nightShiftIdeaDrivenIdeasQueue: Array<{ id: number; title: string; description?: string }>;
  /** Auto idea-driven: current phase of the automated flow. */
  ideaDrivenAutoPhase: "analyze" | "milestones" | "tickets" | "execute" | null;
  /** Auto idea-driven: milestones parsed from agent output, waiting for ticket creation. */
  ideaDrivenPendingMilestones: Array<{ id?: number; name: string; description: string }>;
  /** Auto idea-driven: index of the current milestone being processed for ticket creation. */
  ideaDrivenCurrentMilestoneIndex: number;
  /** Auto idea-driven: all tickets to execute in the current cycle. */
  ideaDrivenAllTickets: Array<{ id: string; number: number; title: string; description?: string; priority: string; milestoneId?: number; ideaId?: number }>;
  /** Auto idea-driven: index of the current ticket being executed in the circle. */
  ideaDrivenCurrentTicketIndex: number;
  /** Idea-driven: checklist items (analyze, milestones, tickets, execute steps); shown in night shift section. */
  ideaDrivenChecklist: Array<{ id: string; label: string; status: "pending" | "in_progress" | "done" }>;
  /** Idea-driven: log messages; shown in night shift section. */
  ideaDrivenLogs: Array<{ id: string; timestamp: string; message: string }>;
  /** Auto idea-driven execute: per-ticket circle phase or 'done'. Key = ticket id. */
  ideaDrivenTicketPhases: Record<string, NightShiftCirclePhase | "done">;
  /** Timestamp (ms) when refreshData last completed successfully; null before first refresh. */
  lastRefreshedAt: number | null;
  /** Project path -> same path (indicates report exists at path/analysis-report.txt). Set when static analysis run completes. */
  lastStaticAnalysisReportByProject: Record<string, string>;
  /** runId -> projectPath for in-flight static analysis runs; cleared when run exits. */
  staticAnalysisRunIdToProjectPath: Record<string, string>;
}

export interface RunActions {
  setError: (e: string | null) => void;
  setActiveProjects: (p: string[] | ((prev: string[]) => string[])) => void;
  toggleProject: (path: string) => void;
  saveActiveProjects: () => Promise<void>;
  setSelectedPromptRecordIds: (ids: number[] | ((prev: number[]) => number[])) => void;
  setTiming: React.Dispatch<React.SetStateAction<Timing>>;
  setRunInfos: React.Dispatch<React.SetStateAction<RunInfo[]>>;
  /** Set localUrl on a run (first detected localhost URL from script output). */
  setLocalUrl: (runId: string, localUrl: string) => void;
  setSelectedRunId: (id: string | null) => void;
  refreshData: () => Promise<void>;
  runScript: () => Promise<void>;
  runWithParams: (params: {
    promptIds?: number[];
    combinedPromptRecord?: string;
    activeProjects: string[];
    runLabel: string | null;
  }) => Promise<string | null>;

  stopScript: () => Promise<void>;
  stopRun: (runId: string) => Promise<void>;
  /** Called when a run exits (e.g. from Tauri); no-op if queue not used. */
  runNextInQueue: (runId: string) => void;
  /** Clear all queued temp-ticket jobs (fast dev, debug, etc.). */
  clearPendingTempTicketQueue: () => void;
  /** Remove a single job from the pending temp-ticket queue by index. */
  removeFromPendingTempTicketQueue: (index: number) => void;
  runImplementAll: (projectPath: string, promptContent?: string) => Promise<string | null>;
  /** Run one Implement All run per slot (1..MAX_TERMINAL_SLOTS) with distinct prompt and label; used when tickets are in queue. */
  runImplementAllForTickets: (
    projectPath: string,
    slots: Array<{ slot: number; promptContent: string; label: string; meta?: RunMeta }>
  ) => Promise<string | null>;
  /** Run a single setup prompt (design/ideas/etc.) and open it in the floating terminal. */
  runSetupPrompt: (projectPath: string, promptContent: string, label: string, provider?: string) => Promise<string | null>;
  /** Run a temporary ticket (single prompt) on the next free slot (1..MAX_TERMINAL_SLOTS) with optional meta for post-run actions. */
  runTempTicket: (
    projectPath: string,
    promptContent: string,
    label: string,
    meta?: RunMeta
  ) => Promise<string | null>;
  /** Add a placeholder Ask run so it appears in the terminal section immediately; pass returned runId as meta.placeholderRunId to runTempTicket. Returns null if no free slot. */
  addPlaceholderAskRun: (label: string) => string | null;
  /** Run an npm script in the project directory (e.g. npm run dev). Tauri only. */
  runNpmScript: (projectPath: string, scriptName: string) => Promise<string | null>;
  /** Run static analysis checklist directly (no agent). Runs each tool in project dir, writes report. Tauri only. When selectedToolIds is provided, only those tools run; otherwise all. */
  runStaticAnalysisChecklist: (projectPath: string, selectedToolIds?: string[]) => Promise<string | null>;
  /** Run an npm script in the system Terminal (macOS only). Returns true if opened. */
  runNpmScriptInExternalTerminal: (projectPath: string, scriptName: string) => Promise<boolean>;
  /** Run an arbitrary command in the system Terminal in the project directory (macOS only). Returns true if opened. */
  runCommandInExternalTerminal: (projectPath: string, command: string) => Promise<boolean>;
  /** Open Terminal and run npm run build:desktop in current dir (macOS; use when running via tauri dev). */
  runBuildDesktop: () => Promise<boolean>;
  /** Open Terminal and run node script/tauri/copy-build-to-desktop.mjs in current dir (macOS). */
  runCopyBuildToDesktop: () => Promise<boolean>;
  setFloatingTerminalRunId: (id: string | null) => void;
  setFloatingTerminalMinimized: (minimized: boolean) => void;
  clearFloatingTerminal: () => void;
  /** Remove a run from the dock (runningRuns); clears floating terminal if it was that run. */
  removeRunFromDock: (runId: string) => void;
  stopAllImplementAll: () => Promise<void>;
  clearImplementAllLogs: () => void;
  archiveImplementAllLogs: () => void;
  /** Append a completed run's output to terminal output history (called from hydration on script-exited). */
  addTerminalOutputToHistory: (entry: Omit<TerminalOutputHistoryEntry, "id">) => void;
  /** When a "Static analysis checklist" run exits, call with its runId to mark report available for that project. */
  markStaticAnalysisReportReady: (runId: string) => void;
  /** Remove a single run from terminal output history by id. */
  removeTerminalOutputFromHistory: (id: string) => void;
  clearTerminalOutputHistory: () => void;
  getTimingForRun: () => Record<string, number>;
  // Hydration/setters used by RunStoreHydration
  setIsTauriEnv: (v: boolean | null | ((prev: boolean | null) => boolean | null)) => void;
  setLoading: (v: boolean | ((prev: boolean) => boolean)) => void;
  setAllProjects: (v: string[]) => void;
  setActiveProjectsSync: (v: string[]) => void;
  setPromptRecords: (v: PromptRecordItem[]) => void;
  addPrompt: (title: string, content: string) => void;
  setNightShiftActive: (active: boolean) => void;
  setNightShiftReplenishCallback: (cb: ((slot: 1 | 2 | 3, exitingRun?: RunInfo | null) => Promise<void>) | null) => void;
  setNightShiftCircleState: (mode: boolean, phase: NightShiftCirclePhase | null, completed: number) => void;
  incrementNightShiftCircleCompleted: () => void;
  setNightShiftIdeaDrivenState: (state: {
    mode: boolean;
    idea: { id: number; title: string; description?: string } | null;
    tickets: Array<{ id: string; number: number; title: string; description?: string; priority: string; featureName?: string; agents?: string[]; milestoneId?: number; ideaId?: number }>;
    ticketIndex: number;
    phase: NightShiftCirclePhase | null;
    completedInPhase: number;
    ideasQueue: Array<{ id: number; title: string; description?: string }>;
  }) => void;
  setIdeaDrivenAutoState: (state: {
    phase: "analyze" | "milestones" | "tickets" | "execute" | null;
    pendingMilestones: Array<{ id?: number; name: string; description: string }>;
    currentMilestoneIndex: number;
    allTickets: Array<{ id: string; number: number; title: string; description?: string; priority: string; milestoneId?: number; ideaId?: number }>;
    currentTicketIndex: number;
  }) => void;
  appendIdeaDrivenLog: (message: string) => void;
  setIdeaDrivenChecklist: (items: Array<{ id: string; label: string; status: "pending" | "in_progress" | "done" }>) => void;
  setIdeaDrivenChecklistItemStatus: (id: string, status: "pending" | "in_progress" | "done") => void;
  clearIdeaDrivenProgress: () => void;
  setIdeaDrivenTicketPhases: (
    phases:
      | Record<string, NightShiftCirclePhase | "done">
      | ((prev: Record<string, NightShiftCirclePhase | "done">) => Record<string, NightShiftCirclePhase | "done">)
  ) => void;
}

export type RunStore = RunState & RunActions;

/** Registry for one-time handlers when a temp ticket run completes (key = onComplete + ':' + (payload.projectId ?? payload.requestId ?? runId)). */
const runCompleteHandlers = new Map<string, (stdout: string) => void>();

export function registerRunCompleteHandler(key: string, handler: (stdout: string) => void): void {
  runCompleteHandlers.set(key, handler);
}

export function takeRunCompleteHandler(key: string): ((stdout: string) => void) | undefined {
  const h = runCompleteHandlers.get(key);
  runCompleteHandlers.delete(key);
  return h;
}

/** Pending temp-ticket job (fast dev, debug, etc.) waiting for a free slot. */
export interface PendingTempTicketJob {
  projectPath: string;
  promptContent: string;
  label: string;
  meta?: RunMeta;
}

/** Start one pending temp-ticket job if queue non-empty and a slot is free. Called after enqueue and on run exit. */
function processTempTicketQueue(
  get: () => RunStore,
  set: (partial: RunState | ((s: RunState) => RunState | Partial<RunState>)) => void
): void {
  const state = get();
  if (state.pendingTempTicketQueue.length === 0) return;
  const job = state.pendingTempTicketQueue[0];
  const placeholderRunId = job.meta?.placeholderRunId;
  let tempId: string;

  if (placeholderRunId) {
    const existing = state.runningRuns.find((r) => r.runId === placeholderRunId);
    if (!existing?.slot) {
      set((s) => ({ pendingTempTicketQueue: s.pendingTempTicketQueue.slice(1) }));
      processTempTicketQueue(get, set);
      return;
    }
    tempId = placeholderRunId;
  } else {
    const slot = getNextFreeSlotOrNull(state.runningRuns);
    if (slot === null) return;
    tempId = `pending-${Date.now()}-${slot}-${Math.random().toString(36).slice(2, 9)}`;
    const placeholder: RunInfo = {
      runId: tempId,
      label: job.label,
      logLines: [],
      status: "running",
      startedAt: Date.now(),
      slot,
      meta: job.meta ?? undefined,
    };
    set((s) => ({
      pendingTempTicketQueue: s.pendingTempTicketQueue.slice(1),
      runningRuns: [...s.runningRuns, placeholder],
      selectedRunId: tempId,
    }));
  }

  if (placeholderRunId) {
    set((s) => ({ pendingTempTicketQueue: s.pendingTempTicketQueue.slice(1) }));
  }

  (async () => {
    try {
      // #region agent log
      const payload = runRunTerminalAgentPayload(job.projectPath, job.promptContent, job.label, job.meta?.agentMode, job.meta?.provider);
      debugIngest({ sessionId: "c29a12", location: "run-store.ts:processTempTicketQueue:beforeInvoke", message: "run_run_terminal_agent payload", data: { label: (job.label || "").slice(0, 80), payloadKeys: Object.keys(payload), hasArgs: !!payload.args, agentMode: job.meta?.agentMode, provider: job.meta?.provider, promptLen: (job.promptContent || "").length }, timestamp: Date.now(), hypothesisId: "H2" }, { "X-Debug-Session-Id": "c29a12" });
      // #endregion
      const { run_id } = await invoke<{ run_id: string }>("run_run_terminal_agent", payload);
      set((s) => ({
        runningRuns: s.runningRuns.map((r) =>
          r.runId === tempId ? { ...r, runId: run_id } : r
        ),
        selectedRunId: run_id,
      }));
      processTempTicketQueue(get, set);
    } catch (e) {
      // #region agent log
      const errMsg = e instanceof Error ? e.message : String(e);
      debugIngest({ sessionId: "c29a12", location: "run-store.ts:processTempTicketQueue:catch", message: "invoke run_run_terminal_agent failed", data: { error: errMsg, label: job.label }, timestamp: Date.now(), hypothesisId: "H1" }, { "X-Debug-Session-Id": "c29a12" });
      // #endregion
      set((s) => ({
        ...s,
        error: errMsg,
        runningRuns: s.runningRuns.filter((r) => r.runId !== tempId),
        pendingTempTicketQueue: [job, ...s.pendingTempTicketQueue],
      }));
      toast.error(errMsg ? `Failed to start agent: ${errMsg}` : "Failed to start queued agent.");
      processTempTicketQueue(get, set);
    }
  })();
}

const initialState: RunState = {
  isTauriEnv: null,
  loading: true,
  error: null,
  dataWarning: null,
  allProjects: [],
  activeProjects: [],
  prompts: [],
  selectedPromptRecordIds: [],
  timing: DEFAULT_TIMING,
  runningRuns: [],
  selectedRunId: null,
  pendingTempTicketQueue: [],

  archivedImplementAllLogs: [],
  floatingTerminalRunId: null,
  floatingTerminalMinimized: false,
  terminalOutputHistory: [],
  nightShiftActive: false,
  nightShiftReplenishCallback: null,
  nightShiftCircleMode: false,
  nightShiftCirclePhase: null,
  nightShiftCircleCompletedInPhase: 0,
  nightShiftIdeaDrivenMode: false,
  nightShiftIdeaDrivenIdea: null,
  nightShiftIdeaDrivenTickets: [],
  nightShiftIdeaDrivenTicketIndex: 0,
  nightShiftIdeaDrivenPhase: null,
  nightShiftIdeaDrivenCompletedInPhase: 0,
  nightShiftIdeaDrivenIdeasQueue: [],
  ideaDrivenAutoPhase: null,
  ideaDrivenPendingMilestones: [],
  ideaDrivenCurrentMilestoneIndex: 0,
  ideaDrivenAllTickets: [],
  ideaDrivenCurrentTicketIndex: 0,
  ideaDrivenChecklist: [],
  ideaDrivenLogs: [],
  ideaDrivenTicketPhases: {},
  lastRefreshedAt: null,
  lastStaticAnalysisReportByProject: {},
  staticAnalysisRunIdToProjectPath: {},
};

const TERMINAL_HISTORY_MAX = 100;

export const useRunStore = create<RunStore>()((set, get) => ({
  ...initialState,

  setError: (e) => set({ error: e }),

  setActiveProjects: (p) =>
    set((s) => ({
      activeProjects: typeof p === "function" ? p(s.activeProjects) : p,
    })),

  toggleProject: (path) =>
    set((s) => ({
      activeProjects: s.activeProjects.includes(path)
        ? s.activeProjects.filter((x) => x !== path)
        : [...s.activeProjects, path],
    })),

  saveActiveProjects: async () => {
    const { activeProjects } = get();
    try {
      await invoke("save_active_projects", { projects: activeProjects });
      set({ error: null });
      toast.success("Saved active projects to cursor_projects.json");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ error: msg });
      toast.error("Failed to save projects", { description: msg });
    }
  },

  setSelectedPromptRecordIds: (ids) =>
    set((s) => ({
      selectedPromptRecordIds:
        typeof ids === "function" ? ids(s.selectedPromptRecordIds) : ids,
    })),

  setTiming: (updater) =>
    set((s) => ({
      timing: typeof updater === "function" ? updater(s.timing) : updater,
    })),

  setRunInfos: (updater) =>
    set((s) => ({
      runningRuns:
        typeof updater === "function" ? updater(s.runningRuns) : updater,
    })),

  setSelectedRunId: (id) => set({ selectedRunId: id }),

  getTimingForRun: () => {
    const { timing } = get();
    return {
      sleep_after_open_project: timing.sleep_after_open_project,
      sleep_after_window_focus: timing.sleep_after_window_focus,
      sleep_between_shift_tabs: timing.sleep_between_shift_tabs,
      sleep_after_all_shift_tabs: timing.sleep_after_all_shift_tabs,
      sleep_after_cmd_n: timing.sleep_after_cmd_n,
      sleep_before_paste: timing.sleep_before_paste,
      sleep_after_paste: timing.sleep_after_paste,
      sleep_after_enter: timing.sleep_after_enter,
      sleep_between_projects: timing.sleep_between_projects,
      sleep_between_rounds: timing.sleep_between_rounds,
    };
  },

  refreshData: async () => {
    set({ error: null, dataWarning: null });
    // #region agent log
    debugIngest({ sessionId: "8a3da1", location: "run-store.ts:refreshData", message: "refreshData_start", data: { isTauri }, timestamp: Date.now(), hypothesisId: "H2" }, { "X-Debug-Session-Id": "8a3da1" });
    // #endregion
    try {
      if (isTauri) {
        invoke("frontend_debug_log", { location: "run-store.ts:refreshData", message: "run-store: about to invoke list_february_folders, get_active_projects, get_prompts", data: {} }).catch(() => {});
        const [all, active, promptList] = await Promise.all([
          invoke<string[]>("list_february_folders"),
          invoke<string[]>("get_active_projects"),
          invoke<PromptRecordItem[]>("get_prompts"),
        ]);
        set({ allProjects: all ?? [], activeProjects: active ?? [], prompts: promptList ?? [], lastRefreshedAt: Date.now() });
      } else {
        const [dataRes, promptsRes] = await Promise.all([
          fetch("/api/data"),
          fetch("/api/data/prompts"),
        ]);
        if (!dataRes.ok) throw new Error(await getApiErrorMessage(dataRes));
        const data = await dataRes.json();
        const warning =
          typeof (data as { _warning?: string })._warning === "string"
            ? (data as { _warning: string })._warning
            : null;
        let prompts: PromptRecordItem[] = Array.isArray(data.prompts) ? data.prompts : [];
        if (promptsRes.ok) {
          try {
            const promptsList = await promptsRes.json();
            if (Array.isArray(promptsList)) {
              prompts = promptsList.map((p: { id: number; title: string; content?: string }) => ({
                id: p.id,
                title: p.title ?? "",
                content: p.content ?? "",
              }));
            }
          } catch {
            // keep prompts from /api/data if prompts fetch fails
          }
        }
        set({
          allProjects: Array.isArray(data.allProjects) ? data.allProjects : [],
          activeProjects: Array.isArray(data.activeProjects) ? data.activeProjects : [],
          prompts,
          dataWarning: warning ?? null,
          lastRefreshedAt: Date.now(),
        });
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      // #region agent log
      debugIngest({
        location: "run-store.ts:refreshData",
        message: "refreshData error (list_february_folders / get_active_projects / get_prompts)",
        data: { error: errMsg },
        timestamp: Date.now(),
        hypothesisId: "B",
      });
      // #endregion
      set({ error: errMsg });
    } finally {
      // #region agent log
      debugIngest({ sessionId: "8a3da1", location: "run-store.ts:refreshData", message: "refreshData_finally_loading_false", data: {}, timestamp: Date.now(), hypothesisId: "H2" }, { "X-Debug-Session-Id": "8a3da1" });
      // #endregion
      set({ loading: false });
    }
  },

  runScript: async () => {
    const { selectedPromptRecordIds, activeProjects, getTimingForRun, setError, setRunInfos, setSelectedRunId } = get();
    if (selectedPromptRecordIds.length === 0) {
      set({ error: "Select at least one prompt" });
      return;
    }
    if (activeProjects.length === 0) {
      set({ error: "Select at least one project" });
      return;
    }
    set({ error: null });
    try {
      const { run_id } = await invoke<{ run_id: string }>("run_script", {
        args: {
          promptIds: selectedPromptRecordIds,
          combinedPromptRecord: null,
          activeProjects,
          timing: getTimingForRun(),
          runLabel: null,
        },
      });
      set((s) => ({
        runningRuns: [
          ...s.runningRuns,
          { runId: run_id, label: "Manual run", logLines: [], status: "running" },
        ],
        selectedRunId: run_id,
      }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  runWithParams: async (params) => {
    const { getTimingForRun } = get();
    set({ error: null });
    const hasCombined = params.combinedPromptRecord != null && params.combinedPromptRecord.trim() !== "";
    const hasIds = Array.isArray(params.promptIds) && params.promptIds.length > 0;
    if (!hasCombined && !hasIds) {
      set({ error: "Provide either combinedPromptRecord or promptIds" });
      return null;
    }
    try {
      const { run_id } = await invoke<{ run_id: string }>("run_script", {
        args: {
          promptIds: hasIds ? params.promptIds : [],
          combinedPromptRecord: hasCombined ? params.combinedPromptRecord : null,
          activeProjects: params.activeProjects,
          timing: getTimingForRun(),
          runLabel: params.runLabel,
        },
      });
      set((s) => ({
        runningRuns: [
          ...s.runningRuns,
          {
            runId: run_id,
            label: params.runLabel ?? "Run",
            logLines: [],
            status: "running",
          },
        ],
        selectedRunId: run_id,
      }));
      return run_id;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },



  stopScript: async () => {
    try {
      await invoke("stop_script");
      const now = Date.now();
      set((s) => ({
        runningRuns: s.runningRuns.map((r) =>
          r.status === "running"
            ? { ...r, status: "done" as const, doneAt: now }
            : r
        ),
      }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  runImplementAll: async (projectPath, promptContent) => {
    const { setError } = get();
    const path = projectPath?.trim();
    if (!path) {
      set({ error: "Project path is required for Implement All" });
      return null;
    }
    set({ error: null });
    const runIds: string[] = [];
    try {
      for (const slot of [1, 2, 3] as const) {
        const { run_id } = await invoke<{ run_id: string }>("run_implement_all", {
          projectPath: path,
          slot,
          promptContent: promptContent ?? null,
        });
        runIds.push(run_id);
        const label = `Implement All (Terminal ${slot})`;
        set((s) => ({
          runningRuns: [
            ...s.runningRuns,
            {
              runId: run_id,
              label,
              logLines: [],
              status: "running" as const,
              startedAt: Date.now(),
              slot,
            },
          ],
          selectedRunId: run_id,
        }));
        if (slot < 3) {
          // stagger starts; runImplementAll still uses 3 slots
          await new Promise((r) => setTimeout(r, 400));
        }
      }
      return runIds[0] ?? null;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  runImplementAllForTickets: async (projectPath, slots) => {
    const { setError } = get();
    const path = projectPath?.trim();
    if (!path) {
      set({ error: "Project path is required for Implement All" });
      return null;
    }
    if (!slots.length) {
      set({ error: "At least one slot is required" });
      return null;
    }
    set({ error: null });
    let firstRunId: string | null = null;
    try {
      for (let i = 0; i < slots.length; i++) {
        const { slot, promptContent, label, meta } = slots[i];
        const { run_id } = await invoke<{ run_id: string }>("run_implement_all", {
          projectPath: path,
          slot,
          promptContent: promptContent.trim() || null,
        });
        if (firstRunId == null) firstRunId = run_id;
        set((s) => ({
          runningRuns: [
            ...s.runningRuns,
            {
              runId: run_id,
              label,
              logLines: [],
              status: "running" as const,
              startedAt: Date.now(),
              slot,
              ...(meta && { meta }),
            },
          ],
          selectedRunId: run_id,
        }));
        if (i < slots.length - 1) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
      return firstRunId;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  runSetupPrompt: async (projectPath, promptContent, label, provider) => {
    if (!isTauri) {
      const msg = "Worker agents require the desktop app. Run the app with Tauri (from the repo or install the desktop build).";
      set({ error: msg });
      toast.error(msg);
      return null;
    }
    const path = projectPath?.trim();
    if (!path) {
      set({ error: "Project path is required" });
      return null;
    }
    if (!promptContent?.trim()) {
      set({ error: "Prompt content is empty" });
      return null;
    }
    set({ error: null });
    try {
      const { run_id } = await invoke<{ run_id: string }>("run_run_terminal_agent", runRunTerminalAgentPayload(path, promptContent.trim(), `Setup Prompt: ${label}`, undefined, provider));
      const runLabel = `Setup Prompt: ${label}`;
      set((s) => ({
        runningRuns: [
          ...s.runningRuns,
          {
            runId: run_id,
            label: runLabel,
            logLines: [],
            status: "running" as const,
            startedAt: Date.now(),
          },
        ],
        selectedRunId: run_id,
        floatingTerminalRunId: run_id,
      }));
      return run_id;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  runTempTicket: async (projectPath, promptContent, label, meta): Promise<string | null> => {
    if (!isTauri) {
      const msg = "Worker agents require the desktop app. Run the app with Tauri (from the repo or install the desktop build).";
      set({ error: msg });
      toast.error(msg);
      return null;
    }
    const path = projectPath?.trim();
    if (!path) {
      set({ error: "Project path is required" });
      return null;
    }
    if (!promptContent?.trim()) {
      set({ error: "Prompt content is empty" });
      return null;
    }
    set({ error: null });
    const job: PendingTempTicketJob = {
      projectPath: path,
      promptContent: promptContent.trim(),
      label,
      meta,
    };
    set((s) => ({
      pendingTempTicketQueue: [...s.pendingTempTicketQueue, job],
    }));
    processTempTicketQueue(get, set);
    return "queued";
  },

  addPlaceholderAskRun: (label): string | null => {
    const slot = getNextFreeSlotOrNull(get().runningRuns);
    if (slot === null) return null;
    const runId = `ask-placeholder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const placeholder: RunInfo = {
      runId,
      label,
      logLines: [],
      status: "running",
      startedAt: Date.now(),
      slot,
    };
    set((s) => ({
      runningRuns: [...s.runningRuns, placeholder],
      selectedRunId: runId,
    }));
    return runId;
  },

  runNextInQueue: () => {
    processTempTicketQueue(get, set);
  },

  setLocalUrl: (runId, localUrl) => {
    set((s) => ({
      runningRuns: s.runningRuns.map((r) =>
        r.runId === runId && !r.localUrl ? { ...r, localUrl } : r
      ),
    }));
  },

  runNpmScript: async (projectPath, scriptName) => {
    const path = projectPath?.trim();
    if (!path) {
      set({ error: "Project path is required" });
      return null;
    }
    const name = scriptName?.trim();
    if (!name) {
      set({ error: "Script name is required" });
      return null;
    }
    set({ error: null });
    try {
      const { run_id } = await invoke<{ run_id: string }>("run_npm_script", {
        projectPath: path,
        scriptName: name,
      });
      const label = `npm run ${name}`;
      set((s) => ({
        runningRuns: [
          ...s.runningRuns,
          {
            runId: run_id,
            label,
            logLines: [],
            status: "running" as const,
            startedAt: Date.now(),
          },
        ],
        selectedRunId: run_id,
        floatingTerminalRunId: run_id,
        floatingTerminalMinimized: false,
      }));
      return run_id;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },

  runStaticAnalysisChecklist: async (projectPath, selectedToolIds) => {
    if (!isTauri) {
      set({ error: "Static analysis checklist requires the desktop app (Tauri)." });
      toast.error("Static analysis checklist requires the desktop app.");
      return null;
    }
    const path = projectPath?.trim();
    if (!path) {
      set({ error: "Project path is required" });
      return null;
    }
    set({ error: null });
    try {
      const sourceTools =
        selectedToolIds?.length && selectedToolIds.length > 0
          ? STATIC_ANALYSIS_CHECKLIST.tools.filter((t) => selectedToolIds.includes(t.id))
          : STATIC_ANALYSIS_CHECKLIST.tools;
      const tools = sourceTools.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        installCommand: t.installCommand,
        runCommand: t.runCommand,
        optional: t.optional ?? false,
      }));
      const { run_id } = await invoke<{ run_id: string }>("run_static_analysis_checklist", {
        projectPath: path,
        tools,
      });
      const label = "Static analysis checklist";
      set((s) => ({
        runningRuns: [
          ...s.runningRuns,
          {
            runId: run_id,
            label,
            logLines: [],
            status: "running" as const,
            startedAt: Date.now(),
          },
        ],
        selectedRunId: run_id,
        floatingTerminalRunId: run_id,
        floatingTerminalMinimized: false,
        staticAnalysisRunIdToProjectPath: { ...s.staticAnalysisRunIdToProjectPath, [run_id]: path },
      }));
      return run_id;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      toast.error(e instanceof Error ? e.message : "Failed to start static analysis checklist");
      return null;
    }
  },

  runNpmScriptInExternalTerminal: async (projectPath, scriptName) => {
    const path = projectPath?.trim();
    const name = scriptName?.trim();
    if (!path || !name) return false;
    set({ error: null });
    try {
      await invoke("run_npm_script_in_external_terminal", {
        projectPath: path,
        scriptName: name,
      });
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  },

  runCommandInExternalTerminal: async (projectPath, command) => {
    const path = projectPath?.trim();
    const cmd = command?.trim();
    if (!path || !cmd) return false;
    set({ error: null });
    try {
      await invoke("run_command_in_external_terminal", {
        projectPath: path,
        command: cmd,
      });
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  },

  runBuildDesktop: async () => {
    set({ error: null });
    try {
      await invoke("run_build_desktop");
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  },

  runCopyBuildToDesktop: async () => {
    set({ error: null });
    try {
      await invoke("run_copy_build_to_desktop");
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  },

  setFloatingTerminalRunId: (id) => set({ floatingTerminalRunId: id }),

  setFloatingTerminalMinimized: (minimized) => set({ floatingTerminalMinimized: minimized }),

  clearFloatingTerminal: () => set({ floatingTerminalRunId: null }),

  removeRunFromDock: (runId) =>
    set((s) => ({
      runningRuns: s.runningRuns.filter((r) => r.runId !== runId),
      floatingTerminalRunId: s.floatingTerminalRunId === runId ? null : s.floatingTerminalRunId,
    })),

  stopRun: async (runId) => {
    try {
      await invoke("stop_run", { runId });
      set((s) => ({
        runningRuns: s.runningRuns.map((r) =>
          r.runId === runId
            ? { ...r, status: "done" as const, doneAt: Date.now() }
            : r
        ),
      }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  stopAllImplementAll: async () => {
    const { runningRuns, stopRun } = get();
    const implementAllRunning = runningRuns.filter(
      (r) => isImplementAllRun(r) && r.status === "running"
    );
    for (const r of implementAllRunning) {
      await stopRun(r.runId);
    }
  },

  clearImplementAllLogs: () => {
    set((s) => ({
      runningRuns: s.runningRuns.map((r) =>
        isImplementAllRun(r) ? { ...r, logLines: [] } : r
      ),
    }));
  },

  archiveImplementAllLogs: () => {
    set((s) => {
      const implementAllRuns = s.runningRuns.filter((r) => isImplementAllRun(r));
      const allLogLines = implementAllRuns.flatMap((r) =>
        r.logLines.length ? [`--- ${r.label} (${r.runId}) ---`, ...r.logLines] : []
      );
      if (allLogLines.length === 0) return s;
      const entry = {
        id: `archived-${Date.now()}`,
        timestamp: new Date().toISOString(),
        logLines: allLogLines,
      };
      return { archivedImplementAllLogs: [...s.archivedImplementAllLogs, entry] };
    });
    toast.success("Logs archived.");
  },

  markStaticAnalysisReportReady: (runId) =>
    set((s) => {
      const projectPath = s.staticAnalysisRunIdToProjectPath[runId];
      if (!projectPath) return s;
      const nextMapping = { ...s.staticAnalysisRunIdToProjectPath };
      delete nextMapping[runId];
      return {
        lastStaticAnalysisReportByProject: { ...s.lastStaticAnalysisReportByProject, [projectPath]: projectPath },
        staticAnalysisRunIdToProjectPath: nextMapping,
      };
    }),

  addTerminalOutputToHistory: (entry) => {
    set((s) => {
      const id = `history-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const list = [{ ...entry, id }, ...s.terminalOutputHistory].slice(0, TERMINAL_HISTORY_MAX);
      return { terminalOutputHistory: list };
    });
  },

  removeTerminalOutputFromHistory: (id) =>
    set((s) => ({
      terminalOutputHistory: s.terminalOutputHistory.filter((e) => e.id !== id),
    })),

  clearTerminalOutputHistory: () => set({ terminalOutputHistory: [] }),

  clearPendingTempTicketQueue: () => set({ pendingTempTicketQueue: [] }),

  removeFromPendingTempTicketQueue: (index) =>
    set((s) => ({
      pendingTempTicketQueue: s.pendingTempTicketQueue.filter((_, i) => i !== index),
    })),

  setIsTauriEnv: (v) =>
    set((s) => ({
      isTauriEnv: typeof v === "function" ? v(s.isTauriEnv) : v,
    })),
  setLoading: (v) =>
    set((s) => ({ loading: typeof v === "function" ? v(s.loading) : v })),
  setAllProjects: (v) => set({ allProjects: v }),
  setActiveProjectsSync: (v) => set({ activeProjects: v }),
  setPromptRecords: (v) => set({ prompts: v }),

  addPrompt: (title, content) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    set((s) => {
      const nextId =
        s.prompts.length === 0
          ? 1
          : Math.max(...s.prompts.map((p) => p.id), 0) + 1;
      return {
        prompts: [
          ...s.prompts,
          { id: nextId, title: trimmed, content: content || "" },
        ],
      };
    });
  },

  setNightShiftActive: (active) => set({ nightShiftActive: active }),
  setNightShiftReplenishCallback: (cb) => set({ nightShiftReplenishCallback: cb }),
  setNightShiftCircleState: (mode, phase, completed) =>
    set({
      nightShiftCircleMode: mode,
      nightShiftCirclePhase: phase,
      nightShiftCircleCompletedInPhase: completed,
    }),
  incrementNightShiftCircleCompleted: () =>
    set((s) => ({ nightShiftCircleCompletedInPhase: s.nightShiftCircleCompletedInPhase + 1 })),
  setNightShiftIdeaDrivenState: (state) =>
    set({
      nightShiftIdeaDrivenMode: state.mode,
      nightShiftIdeaDrivenIdea: state.idea,
      nightShiftIdeaDrivenTickets: state.tickets,
      nightShiftIdeaDrivenTicketIndex: state.ticketIndex,
      nightShiftIdeaDrivenPhase: state.phase,
      nightShiftIdeaDrivenCompletedInPhase: state.completedInPhase,
      nightShiftIdeaDrivenIdeasQueue: state.ideasQueue,
    }),
  setIdeaDrivenAutoState: (state) =>
    set({
      ideaDrivenAutoPhase: state.phase,
      ideaDrivenPendingMilestones: state.pendingMilestones,
      ideaDrivenCurrentMilestoneIndex: state.currentMilestoneIndex,
      ideaDrivenAllTickets: state.allTickets,
      ideaDrivenCurrentTicketIndex: state.currentTicketIndex,
    }),
  appendIdeaDrivenLog: (message) =>
    set((s) => ({
      ideaDrivenLogs: [
        ...s.ideaDrivenLogs,
        { id: `log-${Date.now()}-${Math.random().toString(36).slice(2)}`, timestamp: new Date().toISOString(), message },
      ],
    })),
  setIdeaDrivenChecklist: (items) => set({ ideaDrivenChecklist: items }),
  setIdeaDrivenChecklistItemStatus: (id, status) =>
    set((s) => ({
      ideaDrivenChecklist: s.ideaDrivenChecklist.map((item) => (item.id === id ? { ...item, status } : item)),
    })),
  clearIdeaDrivenProgress: () => set({ ideaDrivenChecklist: [], ideaDrivenLogs: [] }),
  setIdeaDrivenTicketPhases: (phases) =>
    set((s) => ({
      ideaDrivenTicketPhases: typeof phases === "function" ? phases(s.ideaDrivenTicketPhases) : phases,
    })),
}));

/** Hook with same API as legacy useRunState from context. Use anywhere run state is needed. */
export function useRunState() {
  return useRunStore(
    useShallow((s) => ({
      isTauriEnv: s.isTauriEnv,
      loading: s.loading,
      error: s.error,
      dataWarning: s.dataWarning,
      setError: s.setError,
      allProjects: s.allProjects,
      activeProjects: s.activeProjects,
      setActiveProjects: s.setActiveProjects,
      toggleProject: s.toggleProject,
      saveActiveProjects: s.saveActiveProjects,
      prompts: s.prompts,
      selectedPromptRecordIds: s.selectedPromptRecordIds,
      setSelectedPromptRecordIds: s.setSelectedPromptRecordIds,
      timing: s.timing,
      setTiming: s.setTiming,
      runningRuns: s.runningRuns,
      setRunInfos: s.setRunInfos,
      selectedRunId: s.selectedRunId,
      setSelectedRunId: s.setSelectedRunId,

      refreshData: s.refreshData,
      lastRefreshedAt: s.lastRefreshedAt,
      runScript: s.runScript,
      runWithParams: s.runWithParams,
      stopScript: s.stopScript,
      stopRun: s.stopRun,
      runNextInQueue: s.runNextInQueue,
      clearPendingTempTicketQueue: s.clearPendingTempTicketQueue,
      runImplementAll: s.runImplementAll,
      stopAllImplementAll: s.stopAllImplementAll,
      clearImplementAllLogs: s.clearImplementAllLogs,
      archiveImplementAllLogs: s.archiveImplementAllLogs,
      archivedImplementAllLogs: s.archivedImplementAllLogs,
      terminalOutputHistory: s.terminalOutputHistory,
      addTerminalOutputToHistory: s.addTerminalOutputToHistory,
      removeTerminalOutputFromHistory: s.removeTerminalOutputFromHistory,
      clearTerminalOutputHistory: s.clearTerminalOutputHistory,
      getTimingForRun: s.getTimingForRun,
      runSetupPrompt: s.runSetupPrompt,
      runTempTicket: s.runTempTicket,
      runNpmScript: s.runNpmScript,
      runBuildDesktop: s.runBuildDesktop,
      setLocalUrl: s.setLocalUrl,
      floatingTerminalRunId: s.floatingTerminalRunId,
      setFloatingTerminalRunId: s.setFloatingTerminalRunId,
      floatingTerminalMinimized: s.floatingTerminalMinimized,
      setFloatingTerminalMinimized: s.setFloatingTerminalMinimized,
      clearFloatingTerminal: s.clearFloatingTerminal,
      removeRunFromDock: s.removeRunFromDock,
      nightShiftActive: s.nightShiftActive,
      setNightShiftActive: s.setNightShiftActive,
      setNightShiftReplenishCallback: s.setNightShiftReplenishCallback,
    }))
  );
}
