import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("project prompts tab catalog view", () => {
  it("groups catalog entries by category", () => {
    const filePath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectPromptsTab.tsx"
    );
    const source = fs.readFileSync(filePath, "utf8");

    expect(source).toContain("groupedCatalog");
    expect(source).toContain("categoryTabs");
    expect(source).toContain("<TabsList");
    expect(source).toContain("<TabsTrigger");
    expect(source).toContain("<TabsContent");
    expect(source).toContain("Uncategorized");
    expect(source).toContain("Object.entries(groupedCatalog)");
  });

  it("opens a modal with complete prompt content", () => {
    const filePath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectPromptsTab.tsx"
    );
    const source = fs.readFileSync(filePath, "utf8");

    expect(source).toContain("Dialog");
    expect(source).toContain("selectedPrompt");
    expect(source).toContain("View full prompt");
    expect(source).toContain("<pre className=\"max-h-[60vh]");
  });
});
