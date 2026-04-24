import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("global project chat bubble provider flow", () => {
  it("reads project provider and dispatches runTempTicket with provider", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/GlobalProjectChatBubble.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");

    expect(source).toContain("getAgentProvider");
    expect(source).toContain("runTempTicket");
    expect(source).toContain("provider");
    expect(source).toContain("agentMode: \"agent\"");
  });
});
