import { describe, expect, it } from "vitest";
import { PROJECT_PLANNER_SECTION_ORDER } from "@/lib/project-planner-layout";

describe("project planner layout", () => {
  it("keeps kanban section first", () => {
    expect(PROJECT_PLANNER_SECTION_ORDER[0]).toBe("kanban");
  });

  it("renders planner manager after kanban", () => {
    expect(PROJECT_PLANNER_SECTION_ORDER).toEqual(["kanban", "planner-manager"]);
  });
});
