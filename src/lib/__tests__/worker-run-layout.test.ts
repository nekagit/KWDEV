import { describe, expect, it } from "vitest";
import {
  WORKER_RUN_SECTION_CARD_CLASSNAME,
  WORKER_RUN_SECTION_SURFACE_CLASSNAME,
  getWorkerRunSectionsGridClassName,
} from "@/lib/worker-run-layout";

describe("worker-run-layout", () => {
  it("keeps a two-column layout when two or more sections are open", () => {
    expect(getWorkerRunSectionsGridClassName(2)).toContain("lg:grid-cols-2");
    expect(getWorkerRunSectionsGridClassName(4)).toContain("lg:grid-cols-2");
  });

  it("keeps a single-column layout when one section is open", () => {
    expect(getWorkerRunSectionsGridClassName(1)).toContain("lg:grid-cols-1");
  });

  it("uses colorful gradient surfaces for all worker section cards", () => {
    const surfaces = Object.values(WORKER_RUN_SECTION_SURFACE_CLASSNAME);
    expect(surfaces).toHaveLength(8);
    for (const surfaceClassName of surfaces) {
      expect(surfaceClassName).toContain("bg-gradient-to-br");
      expect(surfaceClassName).toContain("rounded-2xl");
      expect(surfaceClassName).toContain("overflow-hidden");
    }
  });

  it("keeps section cards lightweight and transition-enabled", () => {
    expect(WORKER_RUN_SECTION_CARD_CLASSNAME).not.toContain("border");
    expect(WORKER_RUN_SECTION_CARD_CLASSNAME).toContain("transition-all");
    expect(WORKER_RUN_SECTION_CARD_CLASSNAME).toContain("duration-300");
  });
});
