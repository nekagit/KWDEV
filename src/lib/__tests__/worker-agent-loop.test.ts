import { describe, expect, it } from "vitest";
import {
  completeWorkerAgentIteration,
  initialWorkerAgentLoopState,
  startWorkerAgentLoop,
  stopWorkerAgentLoop,
  type WorkerAgentIteration,
} from "@/lib/worker-agent-loop";

function makeIteration(id: string): WorkerAgentIteration {
  return {
    id,
    startedAt: 1_700_000_000_000,
    prompt: "Run worker agent task.",
  };
}

describe("worker-agent-loop", () => {
  it("starts cleanup loop as running and prepends iteration", () => {
    const next = startWorkerAgentLoop(initialWorkerAgentLoopState, makeIteration("cleanup-1"));
    expect(next.active).toBe(true);
    expect(next.status).toBe("running");
    expect(next.iterations[0]?.id).toBe("cleanup-1");
  });

  it("stops refactor loop without deleting previous iterations", () => {
    const started = startWorkerAgentLoop(initialWorkerAgentLoopState, makeIteration("refactor-1"));
    const stopped = stopWorkerAgentLoop(started);
    expect(stopped.active).toBe(false);
    expect(stopped.status).toBe("stopped");
    expect(stopped.iterations).toHaveLength(1);
  });

  it("completes iteration output and artifacts", () => {
    const started = startWorkerAgentLoop(initialWorkerAgentLoopState, makeIteration("worker-1"));
    const completed = completeWorkerAgentIteration(started, "worker-1", {
      executionResult: "Agent completed cleanup tasks.",
      createdArtifacts: "Updated lint config and removed dead files.",
      completedAt: 1_700_000_123_000,
    });
    expect(completed.iterations[0]?.executionResult).toContain("completed cleanup");
    expect(completed.iterations[0]?.createdArtifacts).toContain("dead files");
    expect(completed.iterations[0]?.completedAt).toBe(1_700_000_123_000);
  });
});
