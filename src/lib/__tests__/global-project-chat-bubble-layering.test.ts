import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("global project chat bubble layering", () => {
  it("renders chat panel with top-most fixed z-index", () => {
    const componentPath = path.join(
      process.cwd(),
      "src/components/organisms/GlobalProjectChatBubble.tsx"
    );
    const source = fs.readFileSync(componentPath, "utf8");

    expect(source).toContain("fixed right-4 top-16");
    expect(source).toContain("z-[2147483647]");
  });
});
