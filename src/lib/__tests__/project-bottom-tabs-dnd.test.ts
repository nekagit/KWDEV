import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("project bottom tabs drag and drop", () => {
  it("supports draggable bottom tab triggers with persisted custom order", () => {
    const detailsPath = path.join(
      process.cwd(),
      "src/components/organisms/ProjectDetailsPageContent.tsx"
    );
    const source = fs.readFileSync(detailsPath, "utf8");

    expect(source).toContain("draggable");
    expect(source).toContain("onDragStart");
    expect(source).toContain("onDragOver");
    expect(source).toContain("onDrop");
    expect(source).toContain("kwdev-project-bottom-tab-order");
    expect(source).toContain('const DEFAULT_BOTTOM_TAB_ORDER = ["project", "run", "setup", "todo", "worker", "control", "git"] as const;');
    expect(source).toContain('const LEGACY_BOTTOM_TAB_ORDER = ["project", "todo", "run", "setup", "worker", "control", "git"] as const;');
    expect(source).toContain("const todoIndex = completed.indexOf(\"todo\");");
    expect(source).toContain("const workerIndex = completed.indexOf(\"worker\");");
    expect(source).toContain("if (todoIndex > workerIndex) {");
  });
});
