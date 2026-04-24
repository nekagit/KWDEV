import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("project details planner unification", () => {
  it("adds prompts to the bottom tab circles next to setup", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/ProjectDetailsPageContent.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");
    expect(source).toContain('value: "prompts"');
    expect(source).toContain(
      'const DEFAULT_BOTTOM_TAB_ORDER = ["project", "run", "setup", "prompts", "todo", "worker", "control", "git"] as const;'
    );
    expect(source).toContain('<TabsContent\n            value="prompts"');
  });

  it("keeps Ideas and Milestones out of bottom tab rows", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/ProjectDetailsPageContent.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");
    expect(source).not.toContain('value: "ideas"');
    expect(source).not.toContain('value: "milestones"');
  });

  it("renders ideas, milestones, and tickets inside planner tab content", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/ProjectDetailsPageContent.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");
    expect(source).toContain('<TabsContent\n            value="todo"');
    expect(source).toContain("<ProjectIdeasDocTab");
    expect(source).toContain("<ProjectMilestonesTab");
    expect(source).toContain("<ProjectPlannerTicketsTab");
  });

  it("uses tabs for planner secondary ideas, milestones, and tickets sections", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/ProjectDetailsPageContent.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");
    expect(source).toContain('data-testid="planner-secondary-tabs"');
    expect(source).toContain('<TabsTrigger value="planner-ideas"');
    expect(source).toContain('<TabsTrigger value="planner-milestones"');
    expect(source).toContain('<TabsTrigger value="planner-tickets"');
    expect(source).toContain('<TabsTrigger value="planner-discrepancies"');
    expect(source).toContain("<ProjectPlannerDiscrepanciesTab");
  });
});
