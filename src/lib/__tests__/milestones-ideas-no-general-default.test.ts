import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("milestones and ideas no general default", () => {
  it("does not auto-create General Development in milestones api route", () => {
    const routePath = path.join(
      process.cwd(),
      "src/app/api/data/projects/[id]/milestones/route.ts"
    );
    const source = fs.readFileSync(routePath, "utf8");

    expect(source).not.toContain("GENERAL_DEVELOPMENT_NAME");
    expect(source).not.toContain("GENERAL_DEVELOPMENT_SLUG");
    expect(source).not.toContain('Ensures "General Development" exists');
  });

  it("does not auto-create General Development in ideas api route", () => {
    const routePath = path.join(
      process.cwd(),
      "src/app/api/data/ideas/route.ts"
    );
    const source = fs.readFileSync(routePath, "utf8");

    expect(source).not.toContain("GENERAL_DEVELOPMENT_TITLE");
    expect(source).not.toContain('Ensures "General Development"');
  });

  it("does not auto-create General Development in tauri milestones db helper", () => {
    const helperPath = path.join(
      process.cwd(),
      "src-tauri/src/db/milestones_ideas.rs"
    );
    const source = fs.readFileSync(helperPath, "utf8");

    expect(source).not.toContain("GENERAL_DEVELOPMENT_NAME");
    expect(source).not.toContain("GENERAL_DEVELOPMENT_SLUG");
  });
});
