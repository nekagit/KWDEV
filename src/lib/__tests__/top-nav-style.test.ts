import { describe, expect, it } from "vitest";
import { TOP_NAV_ACTIVE_CLASSNAME } from "@/lib/top-nav-style";

describe("top nav style", () => {
  it("uses the same blue filled active background pattern as project bottom tabs", () => {
    expect(TOP_NAV_ACTIVE_CLASSNAME).toContain("bg-blue-500/90");
    expect(TOP_NAV_ACTIVE_CLASSNAME).toContain("text-white");
  });
});
