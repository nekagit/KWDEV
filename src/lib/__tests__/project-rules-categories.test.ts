import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("project rules categories", () => {
  it("uses a single rules table without architecture/testing/security sub-tabs", () => {
    const projectTabPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectProjectTab.tsx"
    );
    const source = fs.readFileSync(projectTabPath, "utf8");

    expect(source).toContain('<TabsContent value="rules" className="mt-0">');
    expect(source).toContain('entityType="rules"');
    expect(source).not.toContain("const RULE_CATEGORY_TABS");
    expect(source).not.toContain('<TabsTrigger key={category} value={category}');
    expect(source).not.toContain("categoryFilter={category}");
  });
});
