import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("app shell chat bubble", () => {
  it("mounts global project chat bubble in top header", () => {
    const appShellPath = path.join(
      process.cwd(),
      "src/components/templates/AppShell.tsx"
    );
    const source = fs.readFileSync(appShellPath, "utf8");

    expect(source).toContain("GlobalProjectChatBubble");
    expect(source).toContain("<GlobalProjectChatBubble");
  });
});
