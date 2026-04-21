import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("project rules categories", () => {
  it("shows architecture, testing, and security categories inside rules tab", () => {
    const projectTabPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectProjectTab.tsx"
    );
    const source = fs.readFileSync(projectTabPath, "utf8");

    expect(source).toContain("const RULE_CATEGORY_TABS = [\"architecture\", \"testing\", \"security\"] as const;");
    expect(source).toContain('<TabsTrigger key={category} value={category}');
    expect(source).toContain('<TabsContent key={category} value={category}');
    expect(source).toContain("categoryFilter={category}");
  });
});
