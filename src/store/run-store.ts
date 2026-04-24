"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { initialTestingAgentLoopState } from "@/lib/testing-agent-loop";
import { initialWorkerAgentLoopState } from "@/lib/worker-agent-loop";
import { DEFAULT_TIMING } from "@/types/run";

import type { RunStore, RunState, RunActions, PendingTempTicketJob } from "./run-store-types";
export type { RunStore, RunState, RunActions, PendingTempTicketJob };

import { createCoreRunSlice } from "./slices/createCoreRunSlice";
import { createNightShiftSlice } from "./slices/createNightShiftSlice";
import { createAgentLoopsSlice } from "./slices/createAgentLoopsSlice";
import { createTerminalQueueSlice } from "./slices/createTerminalQueueSlice";

const initialState: Omit<RunState, keyof RunActions> = {
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
  testingAgentActive: initialTestingAgentLoopState.active,
  testingAgentReplenishCallback: null,
  testingAgentStatus: initialTestingAgentLoopState.status,
  testingAgentIterations: initialTestingAgentLoopState.iterations,
  cleanupAgentActive: initialWorkerAgentLoopState.active,
  cleanupAgentReplenishCallback: null,
  cleanupAgentStatus: initialWorkerAgentLoopState.status,
  cleanupAgentIterations: initialWorkerAgentLoopState.iterations,
  refactorAgentActive: initialWorkerAgentLoopState.active,
  refactorAgentReplenishCallback: null,
  refactorAgentStatus: initialWorkerAgentLoopState.status,
  refactorAgentIterations: initialWorkerAgentLoopState.iterations,
};

export const useRunStore = create<RunStore>()((...a) => ({
  ...initialState,
  ...createCoreRunSlice(...a),
  ...createNightShiftSlice(...a),
  ...createAgentLoopsSlice(...a),
  ...createTerminalQueueSlice(...a),
}));

const runCompleteHandlers = new Map<string, (stdout: string) => void>();

export function registerRunCompleteHandler(key: string, handler: (stdout: string) => void): void {
  runCompleteHandlers.set(key, handler);
}

export function takeRunCompleteHandler(key: string): ((stdout: string) => void) | undefined {
  const h = runCompleteHandlers.get(key);
  runCompleteHandlers.delete(key);
  return h;
}

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
