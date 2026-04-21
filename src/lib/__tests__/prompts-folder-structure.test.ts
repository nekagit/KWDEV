import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("data/prompts folder structure", () => {
  it("contains only folders at the root", () => {
    const promptsDir = path.join(process.cwd(), "data/prompts");
    const entries = fs.readdirSync(promptsDir, { withFileTypes: true });
    const rootFiles = entries.filter((entry) => entry.isFile());
    expect(rootFiles).toEqual([]);
  });
});
