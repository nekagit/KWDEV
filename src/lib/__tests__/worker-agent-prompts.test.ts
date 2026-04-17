import { describe, expect, it } from "vitest";
import { buildCleanupAgentPrompt, buildRefactorAgentPrompt } from "@/lib/worker-agent-prompts";

describe("worker-agent-prompts", () => {
  const project = { name: "KWDEV", repoPath: "/tmp/kwdev" };

  it("keeps cleanup agent code-only and forbids markdown edits", () => {
    const prompt = buildCleanupAgentPrompt(project, "", 2);
    expect(prompt).toContain("Only modify code-related files");
    expect(prompt).toContain("Do NOT modify any `.md` files");
  });

  it("keeps refactor agent code-only and forbids markdown edits", () => {
    const prompt = buildRefactorAgentPrompt(project, "", 5);
    expect(prompt).toContain("Only modify code-related files");
    expect(prompt).toContain("Do NOT modify any `.md` files");
  });
});
