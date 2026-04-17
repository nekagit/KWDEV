import { describe, expect, it } from "vitest";
import {
  completeTestingAgentIteration,
  initialTestingAgentLoopState,
  startTestingAgentLoop,
  stopTestingAgentLoop,
  type TestingAgentIteration,
} from "@/lib/testing-agent-loop";

function makeIteration(id: string): TestingAgentIteration {
  return {
    id,
    startedAt: 1_700_000_000_000,
    prompt: "Generate tests for login flow.",
  };
}

describe("testing-agent-loop", () => {
  it("starts loop as running and prepends iteration", () => {
    const next = startTestingAgentLoop(initialTestingAgentLoopState, makeIteration("it-1"));
    expect(next.active).toBe(true);
    expect(next.status).toBe("running");
    expect(next.iterations).toHaveLength(1);
    expect(next.iterations[0]?.id).toBe("it-1");
  });

  it("stops loop without deleting existing iterations", () => {
    const started = startTestingAgentLoop(initialTestingAgentLoopState, makeIteration("it-1"));
    const stopped = stopTestingAgentLoop(started);
    expect(stopped.active).toBe(false);
    expect(stopped.status).toBe("stopped");
    expect(stopped.iterations).toHaveLength(1);
  });

  it("completes an iteration with execution output and created tests", () => {
    const started = startTestingAgentLoop(initialTestingAgentLoopState, makeIteration("it-1"));
    const completed = completeTestingAgentIteration(started, "it-1", {
      executionResult: "CLI run finished successfully.",
      createdTests: "Added auth/login.test.ts with 4 assertions.",
      completedAt: 1_700_000_100_000,
    });
    expect(completed.iterations[0]?.executionResult).toContain("successfully");
    expect(completed.iterations[0]?.createdTests).toContain("auth/login.test.ts");
    expect(completed.iterations[0]?.completedAt).toBe(1_700_000_100_000);
  });
});
