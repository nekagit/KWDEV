import type { StateCreator } from "zustand";
import type { RunStore } from "../run-store-types";
import { invoke, isTauri, runRunTerminalAgentPayload } from "@/lib/tauri";
import { debugIngest } from "@/lib/debug-ingest";
import { logAppActivity } from "@/lib/app-activity-log";
import { getApiErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { DEFAULT_TIMING, type Timing, type PromptRecordItem, type RunInfo } from "@/types/run";

export const createCoreRunSlice: StateCreator<RunStore, [], [], Partial<RunStore>> = (set, get) => ({
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
      logAppActivity("run-store", `Saving active projects (${activeProjects.length})`);
      await invoke("save_active_projects", { projects: activeProjects });
      set({ error: null });
      toast.success("Saved active projects to cursor_projects.json");
      logAppActivity("run-store", "Saved active projects");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ error: msg });
      toast.error("Failed to save projects", { description: msg });
      logAppActivity("run-store", `Failed to save active projects: ${msg}`);
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
    logAppActivity("run-store", "Refreshing app data");
    debugIngest({ sessionId: "8a3da1", location: "run-store.ts:refreshData", message: "refreshData_start", data: { isTauri }, timestamp: Date.now(), hypothesisId: "H2" }, { "X-Debug-Session-Id": "8a3da1" });
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
      debugIngest({
        location: "run-store.ts:refreshData",
        message: "refreshData error (list_february_folders / get_active_projects / get_prompts)",
        data: { error: errMsg },
        timestamp: Date.now(),
        hypothesisId: "B",
      });
      set({ error: errMsg });
      logAppActivity("run-store", `Refresh failed: ${errMsg}`);
    } finally {
      debugIngest({ sessionId: "8a3da1", location: "run-store.ts:refreshData", message: "refreshData_finally_loading_false", data: {}, timestamp: Date.now(), hypothesisId: "H2" }, { "X-Debug-Session-Id": "8a3da1" });
      set({ loading: false });
      logAppActivity("run-store", "Refresh finished");
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
      logAppActivity("run-store", `Starting run script (${selectedPromptRecordIds.length} prompts, ${activeProjects.length} projects)`);
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
      logAppActivity("run-store", `Run started: ${run_id}`);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      logAppActivity("run-store", `Run start failed: ${e instanceof Error ? e.message : String(e)}`);
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
      logAppActivity("run-store", `Starting run with params (${params.runLabel ?? "Run"})`);
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
      logAppActivity("run-store", `Run started: ${run_id}`);
      return run_id;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      logAppActivity("run-store", `Run with params failed: ${e instanceof Error ? e.message : String(e)}`);
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
      const msg = "Worker agents require the desktop app.";
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
});
