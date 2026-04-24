import React from "react";
import type {
  Timing,
  PromptRecordItem,
  RunInfo,
  RunMeta,
  TerminalOutputHistoryEntry,
  NightShiftCirclePhase,
} from "@/types/run";
import { type TestingAgentIteration } from "@/lib/testing-agent-loop";
import { type WorkerAgentIteration } from "@/lib/worker-agent-loop";

export interface PendingTempTicketJob {
  projectPath: string;
  promptContent: string;
  label: string;
  meta?: RunMeta;
}

export interface RunState {
  isTauriEnv: boolean | null;
  loading: boolean;
  error: string | null;
  dataWarning: string | null;
  allProjects: string[];
  activeProjects: string[];
  prompts: PromptRecordItem[];
  selectedPromptRecordIds: number[];
  timing: Timing;
  runningRuns: RunInfo[];
  selectedRunId: string | null;
  pendingTempTicketQueue: PendingTempTicketJob[];
  archivedImplementAllLogs: Array<{ id: string; timestamp: string; logLines: string[] }>;
  floatingTerminalRunId: string | null;
  floatingTerminalMinimized: boolean;
  terminalOutputHistory: TerminalOutputHistoryEntry[];
  nightShiftActive: boolean;
  nightShiftReplenishCallback: ((slot: 1 | 2 | 3, exitingRun?: RunInfo | null) => Promise<void>) | null;
  nightShiftCircleMode: boolean;
  nightShiftCirclePhase: NightShiftCirclePhase | null;
  nightShiftCircleCompletedInPhase: number;
  nightShiftIdeaDrivenMode: boolean;
  nightShiftIdeaDrivenIdea: { id: number; title: string; description?: string } | null;
  nightShiftIdeaDrivenTickets: Array<{ id: string; number: number; title: string; description?: string; priority: string; featureName?: string; agents?: string[]; milestoneId?: number; ideaId?: number }>;
  nightShiftIdeaDrivenTicketIndex: number;
  nightShiftIdeaDrivenPhase: NightShiftCirclePhase | null;
  nightShiftIdeaDrivenCompletedInPhase: number;
  nightShiftIdeaDrivenIdeasQueue: Array<{ id: number; title: string; description?: string }>;
  ideaDrivenAutoPhase: "analyze" | "milestones" | "tickets" | "execute" | null;
  ideaDrivenPendingMilestones: Array<{ id?: number; name: string; description: string }>;
  ideaDrivenCurrentMilestoneIndex: number;
  ideaDrivenAllTickets: Array<{ id: string; number: number; title: string; description?: string; priority: string; milestoneId?: number; ideaId?: number }>;
  ideaDrivenCurrentTicketIndex: number;
  ideaDrivenChecklist: Array<{ id: string; label: string; status: "pending" | "in_progress" | "done" }>;
  ideaDrivenLogs: Array<{ id: string; timestamp: string; message: string }>;
  ideaDrivenTicketPhases: Record<string, NightShiftCirclePhase | "done">;
  lastRefreshedAt: number | null;
  lastStaticAnalysisReportByProject: Record<string, string>;
  staticAnalysisRunIdToProjectPath: Record<string, string>;
  testingAgentActive: boolean;
  testingAgentReplenishCallback: ((slot: 1 | 2 | 3, exitingRun?: RunInfo | null) => Promise<void>) | null;
  testingAgentStatus: "idle" | "running" | "stopped";
  testingAgentIterations: TestingAgentIteration[];
  cleanupAgentActive: boolean;
  cleanupAgentReplenishCallback: ((slot: 1 | 2 | 3, exitingRun?: RunInfo | null) => Promise<void>) | null;
  cleanupAgentStatus: "idle" | "running" | "stopped";
  cleanupAgentIterations: WorkerAgentIteration[];
  refactorAgentActive: boolean;
  refactorAgentReplenishCallback: ((slot: 1 | 2 | 3, exitingRun?: RunInfo | null) => Promise<void>) | null;
  refactorAgentStatus: "idle" | "running" | "stopped";
  refactorAgentIterations: WorkerAgentIteration[];
}

export interface RunActions {
  setError: (e: string | null) => void;
  setActiveProjects: (p: string[] | ((prev: string[]) => string[])) => void;
  toggleProject: (path: string) => void;
  saveActiveProjects: () => Promise<void>;
  setSelectedPromptRecordIds: (ids: number[] | ((prev: number[]) => number[])) => void;
  setTiming: React.Dispatch<React.SetStateAction<Timing>>;
  setRunInfos: React.Dispatch<React.SetStateAction<RunInfo[]>>;
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
  runNextInQueue: (runId: string) => void;
  clearPendingTempTicketQueue: () => void;
  removeFromPendingTempTicketQueue: (index: number) => void;
  runImplementAll: (projectPath: string, promptContent?: string) => Promise<string | null>;
  runImplementAllForTickets: (
    projectPath: string,
    slots: Array<{ slot: number; promptContent: string; label: string; meta?: RunMeta }>
  ) => Promise<string | null>;
  runSetupPrompt: (projectPath: string, promptContent: string, label: string, provider?: string) => Promise<string | null>;
  runTempTicket: (
    projectPath: string,
    promptContent: string,
    label: string,
    meta?: RunMeta
  ) => Promise<string | null>;
  addPlaceholderAskRun: (label: string) => string | null;
  runNpmScript: (projectPath: string, scriptName: string) => Promise<string | null>;
  runStaticAnalysisChecklist: (projectPath: string, selectedToolIds?: string[]) => Promise<string | null>;
  runNpmScriptInExternalTerminal: (projectPath: string, scriptName: string) => Promise<boolean>;
  runCommandInExternalTerminal: (projectPath: string, command: string) => Promise<boolean>;
  runBuildDesktop: () => Promise<boolean>;
  runCopyBuildToDesktop: () => Promise<boolean>;
  setFloatingTerminalRunId: (id: string | null) => void;
  setFloatingTerminalMinimized: (minimized: boolean) => void;
  clearFloatingTerminal: () => void;
  removeRunFromDock: (runId: string) => void;
  stopAllImplementAll: () => Promise<void>;
  clearImplementAllLogs: () => void;
  archiveImplementAllLogs: () => void;
  addTerminalOutputToHistory: (entry: Omit<TerminalOutputHistoryEntry, "id">) => void;
  markStaticAnalysisReportReady: (runId: string) => void;
  removeTerminalOutputFromHistory: (id: string) => void;
  clearTerminalOutputHistory: () => void;
  getTimingForRun: () => Record<string, number>;
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
  setTestingAgentActive: (active: boolean) => void;
  setTestingAgentReplenishCallback: (cb: ((slot: 1 | 2 | 3, exitingRun?: RunInfo | null) => Promise<void>) | null) => void;
  startTestingAgentLoop: (iteration: TestingAgentIteration) => void;
  stopTestingAgentLoop: () => void;
  completeTestingAgentIteration: (iterationId: string, executionResult: string, createdTests: string) => void;
  clearTestingAgentIterations: () => void;
  setCleanupAgentActive: (active: boolean) => void;
  setCleanupAgentReplenishCallback: (cb: ((slot: 1 | 2 | 3, exitingRun?: RunInfo | null) => Promise<void>) | null) => void;
  startCleanupAgentLoop: (iteration: WorkerAgentIteration) => void;
  stopCleanupAgentLoop: () => void;
  completeCleanupAgentIteration: (iterationId: string, executionResult: string, createdArtifacts: string) => void;
  clearCleanupAgentIterations: () => void;
  setRefactorAgentActive: (active: boolean) => void;
  setRefactorAgentReplenishCallback: (cb: ((slot: 1 | 2 | 3, exitingRun?: RunInfo | null) => Promise<void>) | null) => void;
  startRefactorAgentLoop: (iteration: WorkerAgentIteration) => void;
  stopRefactorAgentLoop: () => void;
  completeRefactorAgentIteration: (iterationId: string, executionResult: string, createdArtifacts: string) => void;
  clearRefactorAgentIterations: () => void;
}

export type RunStore = RunState & RunActions;
