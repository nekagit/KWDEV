import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROUTES = [
  "src/app/api/generate-ideas/route.ts",
  "src/app/api/generate-architectures/route.ts",
  "src/app/api/generate-prompt/route.ts",
  "src/app/api/generate-project-from-idea/route.ts",
  "src/app/api/generate-ticket-from-prompt/route.ts",
];

describe("generate routes prompt hardening", () => {
  it("uses shared prompt contract helpers in all generation routes", () => {
    for (const route of ROUTES) {
      const source = fs.readFileSync(path.join(process.cwd(), route), "utf8");
      expect(source).toContain("safeJsonParseWithContract");
      expect(source).toContain("buildUntrustedInputSection");
    }
  });
});
