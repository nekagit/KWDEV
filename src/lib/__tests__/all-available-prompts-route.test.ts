import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("all available prompts route", () => {
  it("loads prompts recursively from data/prompts and inline registry", () => {
    const routePath = path.join(
      process.cwd(),
      "src/app/api/data/prompts/all-available/route.ts"
    );
    const source = fs.readFileSync(routePath, "utf8");

    expect(source).toContain("listPromptFiles");
    expect(source).toContain("listPromptFiles(baseDir");
    expect(source).toContain("INLINE_PROMPT_SOURCES");
    expect(source).toContain('sourceType: "data/prompts"');
    expect(source).toContain('sourceType: "inline"');
  });

  it("tracks inline prompt origins across api, lib, and component files", () => {
    const registryPath = path.join(
      process.cwd(),
      "src/lib/prompt-sources-inline.ts"
    );
    const source = fs.readFileSync(registryPath, "utf8");

    expect(source).toContain("src/app/api/generate-ideas/route.ts");
    expect(source).toContain("src/app/api/generate-architectures/route.ts");
    expect(source).toContain("src/app/api/generate-ticket-from-prompt/route.ts");
    expect(source).toContain("src/components/organisms/Tabs/ProjectRunTab.tsx");
    expect(source).toContain("src/components/organisms/GlobalProjectChatBubble.tsx");
    expect(source).toContain("src/lib/testing-agent-prompt.ts");
    expect(source).toContain("src/lib/worker-agent-prompts.ts");
  });
});
