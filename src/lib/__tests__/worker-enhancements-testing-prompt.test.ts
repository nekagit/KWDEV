import { describe, expect, it } from "vitest";
import { buildWorkerEnhancementsTestingPrompt } from "@/lib/worker-enhancements-testing-prompt";

describe("buildWorkerEnhancementsTestingPrompt", () => {
  it("includes all selected checked items in the audit scope", () => {
    const prompt = buildWorkerEnhancementsTestingPrompt([
      "Deduplication",
      "Factory",
      "Code Security",
    ]);
    expect(prompt).toContain("Deduplication");
    expect(prompt).toContain("Factory");
    expect(prompt).toContain("Code Security");
  });

  it("requires scored output and suggestions per checked item", () => {
    const prompt = buildWorkerEnhancementsTestingPrompt(["Long Method"]);
    expect(prompt).toContain("Score");
    expect(prompt).toContain("0-100");
    expect(prompt).toContain("Suggestions");
    expect(prompt).toContain("Long Method");
  });

  it("references PROJECT.md as source of truth", () => {
    const prompt = buildWorkerEnhancementsTestingPrompt();
    expect(prompt).toContain("PROJECT.md");
    expect(prompt).toContain("single source of truth");
  });

  it("asks the agent to analyze current codebase against selected items", () => {
    const prompt = buildWorkerEnhancementsTestingPrompt();
    expect(prompt).toContain("Analyze the current codebase");
    expect(prompt).toContain("selected item");
  });

  it("defines quality-audit report output", () => {
    const prompt = buildWorkerEnhancementsTestingPrompt();
    expect(prompt).toContain("quality-audit-report.md");
    expect(prompt).toContain("Overall Quality Score");
    expect(prompt).toContain("Top 5 Suggestions");
  });
});
