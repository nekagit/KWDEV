import { describe, expect, it } from "vitest";
import { resolveNextOutput } from "../../../script/next-output.mjs";

describe("resolveNextOutput", () => {
  it("uses export in production", () => {
    expect(resolveNextOutput({ NODE_ENV: "production" })).toBe("export");
  });

  it("returns undefined in development", () => {
    expect(resolveNextOutput({ NODE_ENV: "development" })).toBeUndefined();
  });
});
