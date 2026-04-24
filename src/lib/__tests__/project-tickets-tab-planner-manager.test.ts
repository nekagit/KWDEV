import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("project tickets planner manager flow", () => {
  it("uses direct generate-to-backlog flow without confirmation block", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectTicketsTab.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");

    expect(source).toContain("Generate ticket");
    expect(source).toContain("added to backlog.");
    expect(source).not.toContain("Generated ticket — select Milestone & Idea");
    expect(source).not.toContain("Confirm & add to backlog");
  });

  it("does not hardcode General Development defaults for milestone or idea", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectTicketsTab.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");

    expect(source).not.toContain("General Development");
  });
});
