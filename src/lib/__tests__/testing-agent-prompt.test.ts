import { describe, expect, it } from "vitest";
import { buildTestingAgentPrompt } from "@/lib/testing-agent-prompt";

describe("buildTestingAgentPrompt", () => {
  const project = { name: "KWDEV", repoPath: "/tmp/kwdev" };

  it("requires multi-file changes per iteration", () => {
    const prompt = buildTestingAgentPrompt(project, "", 2);
    expect(prompt).toContain("at least 3 files");
    expect(prompt).toContain("Do not stop after a single small test edit");
  });

  it("forbids markdown file changes and keeps scope code-only", () => {
    const prompt = buildTestingAgentPrompt(project, "", 3);
    expect(prompt).toContain("Only modify code-related files");
    expect(prompt).toContain("Do NOT modify any `.md` files");
  });

  it("requires a before-change plan and end summary", () => {
    const prompt = buildTestingAgentPrompt(project, "", 1);
    expect(prompt).toContain("Execution plan");
    expect(prompt).toContain("Changed files summary");
  });

  it("includes project context and iteration number", () => {
    const prompt = buildTestingAgentPrompt(project, "", 7);
    expect(prompt).toContain("Project: KWDEV");
    expect(prompt).toContain("Iteration: 7");
  });
});
