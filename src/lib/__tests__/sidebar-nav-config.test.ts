import { describe, expect, it } from "vitest";
import { getSidebarNavItemsFlat } from "@/lib/sidebar-nav-config";

describe("sidebar nav config", () => {
  it("keeps keyboard shortcuts under configuration and not as a standalone nav item", () => {
    const items = getSidebarNavItemsFlat();
    expect(items.some((item) => item.href === "/configuration")).toBe(true);
    expect(items.some((item) => item.href === "/shortcuts")).toBe(false);
  });

  it("does not expose loading screen as a top navbar item", () => {
    const items = getSidebarNavItemsFlat();
    expect(items.some((item) => item.href === "/loading-screen")).toBe(false);
  });

  it("does not expose company as a top navbar item", () => {
    const items = getSidebarNavItemsFlat();
    expect(items.some((item) => item.href === "/company")).toBe(false);
  });
});
