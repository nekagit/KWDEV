import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("project ideas tab layout", () => {
  it("uses a flat table-and-actions layout without accordions", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectIdeasDocTab.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");

    expect(source).toContain("Ideas (");
    expect(source).toContain("Convert to milestones");
    expect(source).toContain("Add idea");
    expect(source).toContain("<Table>");
    expect(source).not.toContain("AccordionTrigger");
    expect(source).not.toContain("<Accordion");
  });
});
