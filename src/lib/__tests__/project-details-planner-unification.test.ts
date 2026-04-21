import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("project details planner unification", () => {
  it("keeps Ideas and Milestones out of bottom tab rows", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/ProjectDetailsPageContent.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");
    expect(source).not.toContain('value: "ideas"');
    expect(source).not.toContain('value: "milestones"');
  });

  it("renders ideas and milestones inside planner tab content", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/ProjectDetailsPageContent.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");
    expect(source).toContain('<TabsContent\n            value="todo"');
    expect(source).toContain("<ProjectIdeasDocTab");
    expect(source).toContain("<ProjectMilestonesTab");
  });

  it("uses a responsive 2-column grid for planner secondary sections", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/ProjectDetailsPageContent.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");
    expect(source).toContain('data-testid="planner-secondary-grid"');
    expect(source).toContain("grid grid-cols-1 gap-4 lg:grid-cols-2");
  });
});
