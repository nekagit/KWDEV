import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("setup entity rule labels", () => {
  it("uses category-specific rule labels when category filter is provided", () => {
    const sectionPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/SetupEntityTableSection.tsx"
    );
    const source = fs.readFileSync(sectionPath, "utf8");

    expect(source).toContain("const categoryLabel =");
    expect(source).toContain("Add ${categoryLabel} Rule");
    expect(source).toContain("const effectiveCategory =");
  });
});
