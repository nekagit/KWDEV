import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("project project tab skills", () => {
  it("uses shared setup entity tables for prompts/skills/rules/mcp/agents", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectProjectTab.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");

    expect(source).toContain("SetupEntityTableSection");
    expect(source).toContain('entityType="prompts"');
    expect(source).toContain('entityType="skills"');
    expect(source).toContain('entityType="rules"');
    expect(source).toContain('entityType="mcp"');
    expect(source).toContain('entityType="agents"');
    expect(source).toContain('"design"');
    expect(source).toContain("ProjectDesignTab");
    expect(source).not.toContain("ProjectMcpSection");
    expect(source).not.toContain("ProjectAgentsSection");
    expect(source).not.toContain("PromptRecordsPageContent");
  });
});
