/**
 * Pure helpers for cleanup/refactor/testing style worker agent loop state transitions.
 */

export type WorkerAgentStatus = "idle" | "running" | "stopped";

export interface WorkerAgentIteration {
  id: string;
  startedAt: number;
  prompt: string;
  executionResult?: string;
  createdArtifacts?: string;
  runId?: string;
  completedAt?: number;
}

export interface WorkerAgentLoopState {
  active: boolean;
  status: WorkerAgentStatus;
  iterations: WorkerAgentIteration[];
}

export const initialWorkerAgentLoopState: WorkerAgentLoopState = {
  active: false,
  status: "idle",
  iterations: [],
};

export function startWorkerAgentLoop(
  state: WorkerAgentLoopState,
  iteration: WorkerAgentIteration
): WorkerAgentLoopState {
  return {
    active: true,
    status: "running",
    iterations: [iteration, ...state.iterations],
  };
}

export function stopWorkerAgentLoop(state: WorkerAgentLoopState): WorkerAgentLoopState {
  return {
    ...state,
    active: false,
    status: "stopped",
  };
}

export function completeWorkerAgentIteration(
  state: WorkerAgentLoopState,
  iterationId: string,
  payload: { executionResult: string; createdArtifacts: string; completedAt: number }
): WorkerAgentLoopState {
  return {
    ...state,
    iterations: state.iterations.map((item) =>
      item.id === iterationId
        ? {
            ...item,
            executionResult: payload.executionResult,
            createdArtifacts: payload.createdArtifacts,
            completedAt: payload.completedAt,
          }
        : item
    ),
  };
}
