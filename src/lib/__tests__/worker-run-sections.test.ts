import { describe, expect, it } from "vitest";
import { toggleWorkerRunSection } from "@/lib/worker-run-sections";

describe("worker-run-sections", () => {
  it("opens section when currently closed", () => {
    expect(toggleWorkerRunSection(["status"], "queue")).toEqual(["status", "queue"]);
  });

  it("closes section when currently open", () => {
    expect(toggleWorkerRunSection(["status", "queue"], "queue")).toEqual(["status"]);
  });
});
