import type { StateCreator } from "zustand";
import type { RunStore, PendingTempTicketJob } from "../run-store-types";
import { invoke, isTauri, runRunTerminalAgentPayload } from "@/lib/tauri";
import { STATIC_ANALYSIS_CHECKLIST } from "@/lib/static-analysis-checklist";
import { getNextFreeSlotOrNull, isImplementAllRun } from "@/lib/run-helpers";
import { debugIngest } from "@/lib/debug-ingest";
import { logAppActivity } from "@/lib/app-activity-log";
import { toast } from "sonner";
import { type RunInfo } from "@/types/run";

function processTempTicketQueue(
  get: () => RunStore,
  set: (partial: any) => void
): void {
  const state = get();
  if (state.pendingTempTicketQueue.length === 0) return;
  const job = state.pendingTempTicketQueue[0];
  const placeholderRunId = job.meta?.placeholderRunId;
  let tempId: string;

  if (placeholderRunId) {
    const existing = state.runningRuns.find((r) => r.runId === placeholderRunId);
    if (!existing?.slot) {
      set((s: any) => ({ pendingTempTicketQueue: s.pendingTempTicketQueue.slice(1) }));
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
    set((s: any) => ({
      pendingTempTicketQueue: s.pendingTempTicketQueue.slice(1),
      runningRuns: [...s.runningRuns, placeholder],
      selectedRunId: tempId,
    }));
  }

  if (placeholderRunId) {
    set((s: any) => ({ pendingTempTicketQueue: s.pendingTempTicketQueue.slice(1) }));
  }

  (async () => {
    try {
      const payload = runRunTerminalAgentPayload(job.projectPath, job.promptContent, job.label, job.meta?.agentMode, job.meta?.provider);
      debugIngest({ sessionId: "c29a12", location: "run-store.ts:processTempTicketQueue:beforeInvoke", message: "run_run_terminal_agent payload", data: { label: (job.label || "").slice(0, 80), payloadKeys: Object.keys(payload), hasArgs: !!payload.args, agentMode: job.meta?.agentMode, provider: job.meta?.provider, promptLen: (job.promptContent || "").length }, timestamp: Date.now(), hypothesisId: "H2" }, { "X-Debug-Session-Id": "c29a12" });
      const { run_id } = await invoke<{ run_id: string }>("run_run_terminal_agent", payload);
      set((s: any) => ({
        runningRuns: s.runningRuns.map((r: any) =>
          r.runId === tempId ? { ...r, runId: run_id } : r
        ),
        selectedRunId: run_id,
      }));
      processTempTicketQueue(get, set);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      debugIngest({ sessionId: "c29a12", location: "run-store.ts:processTempTicketQueue:catch", message: "invoke run_run_terminal_agent failed", data: { error: errMsg, label: job.label }, timestamp: Date.now(), hypothesisId: "H1" }, { "X-Debug-Session-Id": "c29a12" });
      const selectedProvider = job.meta?.provider;
      const canFallbackProvider =
        !!selectedProvider &&
        selectedProvider !== "cursor" &&
        job.meta?.providerFallbackTried !== true &&
        /not available|not found|command not found|no such file|spawn|ENOENT|provider/i.test(errMsg);

      if (canFallbackProvider) {
        const fallbackJob: PendingTempTicketJob = {
          ...job,
          meta: {
            ...(job.meta ?? {}),
            provider: "cursor",
            providerFallbackTried: true,
          },
        };
        set((s: any) => ({
          ...s,
          error: errMsg,
          runningRuns: s.runningRuns.filter((r: any) => r.runId !== tempId),
          pendingTempTicketQueue: [fallbackJob, ...s.pendingTempTicketQueue],
        }));
        toast.error(
          `Selected provider '${selectedProvider}' is unavailable. Falling back to Cursor provider.`
        );
        processTempTicketQueue(get, set);
        return;
      }

      set((s: any) => ({
        ...s,
        error: errMsg,
        runningRuns: s.runningRuns.filter((r: any) => r.runId !== tempId),
        pendingTempTicketQueue: [job, ...s.pendingTempTicketQueue],
      }));
      toast.error(errMsg ? `Failed to start agent: ${errMsg}` : "Failed to start queued agent.");
      processTempTicketQueue(get, set);
    }
  })();
}

const TERMINAL_HISTORY_MAX = 100;

export const createTerminalQueueSlice: StateCreator<RunStore, [], [], Partial<RunStore>> = (set, get) => ({
  runTempTicket: async (projectPath, promptContent, label, meta) => {
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

  addPlaceholderAskRun: (label) => {
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
      logAppActivity("run-store", `Starting npm script: ${name}`);
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
      logAppActivity("run-store", `npm script started: ${name} (${run_id})`);
      return run_id;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      logAppActivity("run-store", `npm script failed to start (${name}): ${e instanceof Error ? e.message : String(e)}`);
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
      logAppActivity("run-store", `Stopping run: ${runId}`);
      await invoke("stop_run", { runId });
      set((s) => ({
        runningRuns: s.runningRuns.map((r) =>
          r.runId === runId
            ? { ...r, status: "done" as const, doneAt: Date.now() }
            : r
        ),
      }));
      logAppActivity("run-store", `Stopped run: ${runId}`);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      logAppActivity("run-store", `Stop run failed (${runId}): ${e instanceof Error ? e.message : String(e)}`);
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
});
