/**
 * Pure helpers for Testing Agent loop state transitions.
 */

export type TestingAgentStatus = "idle" | "running" | "stopped";

export interface TestingAgentIteration {
  id: string;
  startedAt: number;
  prompt: string;
  executionResult?: string;
  createdTests?: string;
  runId?: string;
  completedAt?: number;
}

export interface TestingAgentLoopState {
  active: boolean;
  status: TestingAgentStatus;
  iterations: TestingAgentIteration[];
}

export const initialTestingAgentLoopState: TestingAgentLoopState = {
  active: false,
  status: "idle",
  iterations: [],
};

export function startTestingAgentLoop(
  state: TestingAgentLoopState,
  iteration: TestingAgentIteration
): TestingAgentLoopState {
  return {
    active: true,
    status: "running",
    iterations: [iteration, ...state.iterations],
  };
}

export function stopTestingAgentLoop(state: TestingAgentLoopState): TestingAgentLoopState {
  return {
    ...state,
    active: false,
    status: "stopped",
  };
}

export function completeTestingAgentIteration(
  state: TestingAgentLoopState,
  iterationId: string,
  payload: { executionResult: string; createdTests: string; completedAt: number }
): TestingAgentLoopState {
  return {
    ...state,
    iterations: state.iterations.map((item) =>
      item.id === iterationId
        ? {
            ...item,
            executionResult: payload.executionResult,
            createdTests: payload.createdTests,
            completedAt: payload.completedAt,
          }
        : item
    ),
  };
}
