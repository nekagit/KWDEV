import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("project details bottom tabs style", () => {
  it("does not use the gray sidebar background on the fixed bottom tab bar", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/ProjectDetailsPageContent.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");
    expect(source).not.toContain("bg-sidebar");
  });

  it("uses filled, borderless tab trigger styles instead of gray muted states", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/ProjectDetailsPageContent.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");
    expect(source).not.toContain("data-[state=inactive]:hover:bg-muted/60");
    expect(source).not.toContain(
      "data-[state=active]:border data-[state=active]:border-border/60"
    );
    expect(source).toContain("border-0");
    expect(source).toContain("bg-sky-500/90");
  });

  it("defines active tab fills with data-state variants so labels stay readable", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/ProjectDetailsPageContent.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");
    expect(source).toContain("data-[state=active]:bg-sky-500/90");
    expect(source).toContain("data-[state=active]:bg-cyan-500/90");
  });

  it("keeps bottom tabs centered with fit-width circular buttons", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/ProjectDetailsPageContent.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");
    expect(source).toContain("left-1/2");
    expect(source).toContain("-translate-x-1/2");
    expect(source).toContain("w-auto");
    expect(source).toContain("rounded-full");
    expect(source).toContain("size-11");
  });
});
