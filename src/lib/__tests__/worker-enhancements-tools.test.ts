import { describe, expect, it } from "vitest";
import {
  getWorkerEnhancementToolIds,
  sanitizeWorkerEnhancementToolIds,
  WORKER_ENHANCEMENT_TOOL_CATEGORIES,
} from "@/lib/worker-enhancements-tools";

describe("worker-enhancements-tools", () => {
  it("defines the five requested top-level categories", () => {
    expect(WORKER_ENHANCEMENT_TOOL_CATEGORIES.map((category) => category.label)).toEqual([
      "Code Quality",
      "Design Patterns",
      "Best Practices",
      "Code Smells",
      "Code Refactoring",
    ]);
  });

  it("includes all requested tool items", () => {
    expect(getWorkerEnhancementToolIds()).toEqual([
      "deduplication",
      "type-consolidation",
      "dead-code-removal",
      "circular-dependencies",
      "type-strengthening",
      "error-handling-cleanup",
      "deprecated-code-removal",
      "ai-slope-optimization",
      "singleton",
      "factory",
      "observer",
      "strategy",
      "template-method",
      "decorator",
      "adapter",
      "code-readability",
      "code-maintainability",
      "code-scalability",
      "code-security",
      "code-reusability",
      "code-modularity",
      "code-flexibility",
      "code-testability",
      "long-method",
      "large-class",
      "switch-statements",
      "shotgun-surgery",
      "feature-envy",
      "inconsistent-naming",
      "extract-method",
      "rename-variable",
      "move-method",
      "extract-class",
      "inline-method",
      "remove-dead-code",
    ]);
  });

  it("keeps best practices grouped into senior level and smart practices", () => {
    const bestPractices = WORKER_ENHANCEMENT_TOOL_CATEGORIES.find((category) => category.id === "best-practices");
    expect(bestPractices?.groups.map((group) => group.label)).toEqual(["Senior Level", "Smart Practices"]);
  });

  it("filters persisted selections to known IDs", () => {
    expect(sanitizeWorkerEnhancementToolIds(["singleton", "unknown", 123, "code-security"])).toEqual([
      "singleton",
      "code-security",
    ]);
  });
});
