import { describe, expect, it } from "vitest";
import { buildCleanupRefactorAgentPrompt } from "@/lib/worker-agent-prompts";

describe("worker-agent-prompts", () => {
  const project = { name: "KWDEV", repoPath: "/tmp/kwdev" };

  it("keeps cleanup+refactor agent code-only and forbids markdown edits", () => {
    const prompt = buildCleanupRefactorAgentPrompt(project, "", 2, []);
    expect(prompt).toContain("Only modify code-related files");
    expect(prompt).toContain("Do NOT modify any `.md` files");
  });

  it("injects selected quality focus labels into cleanup+refactor prompt", () => {
    const prompt = buildCleanupRefactorAgentPrompt(project, "", 5, [
      "Code Readability",
      "Deduplication",
    ]);
    expect(prompt).toContain("## Quality focus");
    expect(prompt).toContain("Code Readability");
    expect(prompt).toContain("Deduplication");
  });
});
