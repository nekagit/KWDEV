import { describe, it, expect } from "vitest";
import { buildRunningAppPreviewUrl } from "../running-app-preview-url";

describe("buildRunningAppPreviewUrl", () => {
  it("returns 127.0.0.1 URL with trailing slash", () => {
    expect(buildRunningAppPreviewUrl(4000)).toBe("http://127.0.0.1:4000/");
    expect(buildRunningAppPreviewUrl(3000)).toBe("http://127.0.0.1:3000/");
  });

  it("rejects invalid ports", () => {
    expect(() => buildRunningAppPreviewUrl(0)).toThrow(RangeError);
    expect(() => buildRunningAppPreviewUrl(65536)).toThrow(RangeError);
    expect(() => buildRunningAppPreviewUrl(NaN)).toThrow(RangeError);
  });
});
