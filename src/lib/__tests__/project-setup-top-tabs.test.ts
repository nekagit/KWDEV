import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("project setup top tabs", () => {
  it("keeps setup top tabs for prompts, skills, design, rules, mcp, and agents", () => {
    const projectTabPath = path.join(
      process.cwd(),
      "src/components/organisms/Tabs/ProjectProjectTab.tsx"
    );
    const source = fs.readFileSync(projectTabPath, "utf8");

    expect(source).toContain('const SETUP_INNER_TABS = ["prompts", "skills", "design", "rules", "mcp", "agents"] as const;');
    expect(source).toContain('<TabsTrigger value="prompts"');
    expect(source).toContain('<TabsTrigger value="skills"');
    expect(source).toContain('<TabsTrigger value="design"');
    expect(source).toContain('<TabsTrigger value="rules"');
    expect(source).toContain('<TabsTrigger value="mcp"');
    expect(source).toContain('<TabsTrigger value="agents"');
  });
});
