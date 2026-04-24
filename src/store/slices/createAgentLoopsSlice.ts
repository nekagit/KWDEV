import type { StateCreator } from "zustand";
import type { RunStore } from "../run-store-types";
import {
  completeTestingAgentIteration,
  startTestingAgentLoop,
  stopTestingAgentLoop,
} from "@/lib/testing-agent-loop";
import {
  completeWorkerAgentIteration,
  startWorkerAgentLoop,
  stopWorkerAgentLoop,
} from "@/lib/worker-agent-loop";

export const createAgentLoopsSlice: StateCreator<RunStore, [], [], Partial<RunStore>> = (set) => ({
  setTestingAgentActive: (active) => set({ testingAgentActive: active }),
  setTestingAgentReplenishCallback: (cb) => set({ testingAgentReplenishCallback: cb }),
  startTestingAgentLoop: (iteration) =>
    set((s) => {
      const next = startTestingAgentLoop(
        {
          active: s.testingAgentActive,
          status: s.testingAgentStatus,
          iterations: s.testingAgentIterations,
        },
        iteration
      );
      return {
        testingAgentActive: next.active,
        testingAgentStatus: next.status,
        testingAgentIterations: next.iterations,
      };
    }),
  stopTestingAgentLoop: () =>
    set((s) => {
      const next = stopTestingAgentLoop({
        active: s.testingAgentActive,
        status: s.testingAgentStatus,
        iterations: s.testingAgentIterations,
      });
      return {
        testingAgentActive: false,
        testingAgentReplenishCallback: null,
        testingAgentStatus: next.status,
        testingAgentIterations: next.iterations,
      };
    }),
  completeTestingAgentIteration: (iterationId, executionResult, createdTests) =>
    set((s) => {
      const next = completeTestingAgentIteration(
        {
          active: s.testingAgentActive,
          status: s.testingAgentStatus,
          iterations: s.testingAgentIterations,
        },
        iterationId,
        { executionResult, createdTests, completedAt: Date.now() }
      );
      return { testingAgentIterations: next.iterations };
    }),
  clearTestingAgentIterations: () => set({ testingAgentIterations: [] }),

  setCleanupAgentActive: (active) => set({ cleanupAgentActive: active }),
  setCleanupAgentReplenishCallback: (cb) => set({ cleanupAgentReplenishCallback: cb }),
  startCleanupAgentLoop: (iteration) =>
    set((s) => {
      const next = startWorkerAgentLoop(
        {
          active: s.cleanupAgentActive,
          status: s.cleanupAgentStatus,
          iterations: s.cleanupAgentIterations,
        },
        iteration
      );
      return {
        cleanupAgentActive: next.active,
        cleanupAgentStatus: next.status,
        cleanupAgentIterations: next.iterations,
      };
    }),
  stopCleanupAgentLoop: () =>
    set((s) => {
      const next = stopWorkerAgentLoop({
        active: s.cleanupAgentActive,
        status: s.cleanupAgentStatus,
        iterations: s.cleanupAgentIterations,
      });
      return {
        cleanupAgentActive: false,
        cleanupAgentReplenishCallback: null,
        cleanupAgentStatus: next.status,
        cleanupAgentIterations: next.iterations,
      };
    }),
  completeCleanupAgentIteration: (iterationId, executionResult, createdArtifacts) =>
    set((s) => {
      const next = completeWorkerAgentIteration(
        {
          active: s.cleanupAgentActive,
          status: s.cleanupAgentStatus,
          iterations: s.cleanupAgentIterations,
        },
        iterationId,
        { executionResult, createdArtifacts, completedAt: Date.now() }
      );
      return { cleanupAgentIterations: next.iterations };
    }),
  clearCleanupAgentIterations: () => set({ cleanupAgentIterations: [] }),

  setRefactorAgentActive: (active) => set({ refactorAgentActive: active }),
  setRefactorAgentReplenishCallback: (cb) => set({ refactorAgentReplenishCallback: cb }),
  startRefactorAgentLoop: (iteration) =>
    set((s) => {
      const next = startWorkerAgentLoop(
        {
          active: s.refactorAgentActive,
          status: s.refactorAgentStatus,
          iterations: s.refactorAgentIterations,
        },
        iteration
      );
      return {
        refactorAgentActive: next.active,
        refactorAgentStatus: next.status,
        refactorAgentIterations: next.iterations,
      };
    }),
  stopRefactorAgentLoop: () =>
    set((s) => {
      const next = stopWorkerAgentLoop({
        active: s.refactorAgentActive,
        status: s.refactorAgentStatus,
        iterations: s.refactorAgentIterations,
      });
      return {
        refactorAgentActive: false,
        refactorAgentReplenishCallback: null,
        refactorAgentStatus: next.status,
        refactorAgentIterations: next.iterations,
      };
    }),
  completeRefactorAgentIteration: (iterationId, executionResult, createdArtifacts) =>
    set((s) => {
      const next = completeWorkerAgentIteration(
        {
          active: s.refactorAgentActive,
          status: s.refactorAgentStatus,
          iterations: s.refactorAgentIterations,
        },
        iterationId,
        { executionResult, createdArtifacts, completedAt: Date.now() }
      );
      return { refactorAgentIterations: next.iterations };
    }),
  clearRefactorAgentIterations: () => set({ refactorAgentIterations: [] }),
});
