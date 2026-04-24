import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("prompts initialize drift safeguards", () => {
  it("checks markdown/json drift before importing prompts", () => {
    const routePath = path.join(
      process.cwd(),
      "src/app/api/data/prompts/initialize/route.ts"
    );
    const source = fs.readFileSync(routePath, "utf8");

    expect(source).toContain("promptsHaveDrift");
    expect(source).toContain("Prompt drift detected");
  });
});
