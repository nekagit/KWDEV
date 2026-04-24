import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("project setup top tabs", () => {
  it("keeps setup top tabs focused on non-prompts categories", () => {
    const projectTabPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectProjectTab.tsx"
    );
    const source = fs.readFileSync(projectTabPath, "utf8");

    expect(source).toContain(
      'const SETUP_INNER_TABS = ["architecture", "testing", "security", "skills", "design", "rules", "mcp", "agents"] as const;'
    );
    expect(source).toContain('<TabsTrigger value="architecture"');
    expect(source).toContain('<TabsTrigger value="testing"');
    expect(source).toContain('<TabsTrigger value="security"');
    expect(source).not.toContain('<TabsTrigger value="prompts"');
    expect(source).toContain('<TabsTrigger value="skills"');
    expect(source).toContain('<TabsTrigger value="design"');
    expect(source).toContain('<TabsTrigger value="rules"');
    expect(source).toContain('<TabsTrigger value="mcp"');
    expect(source).toContain('<TabsTrigger value="agents"');
  });

  it("renders setup design tab with rules table category filter", () => {
    const projectTabPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectProjectTab.tsx"
    );
    const source = fs.readFileSync(projectTabPath, "utf8");

    expect(source).toContain('<TabsContent value="design"');
    expect(source).toContain('entityType="rules"');
    expect(source).toContain('categoryFilter="design"');
  });
});
