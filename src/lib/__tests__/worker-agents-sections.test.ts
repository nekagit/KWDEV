import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPEN_WORKER_AGENT_SECTIONS,
  toggleWorkerAgentsSection,
} from "@/lib/worker-agents-sections";

describe("worker-agents-sections", () => {
  it("opens section when currently closed", () => {
    expect(toggleWorkerAgentsSection(["testing"], "cleanup")).toEqual(["testing", "cleanup"]);
  });

  it("closes section when currently open", () => {
    expect(toggleWorkerAgentsSection(["testing", "cleanup"], "cleanup")).toEqual(["testing"]);
  });

  it("defaults to multiple open sections", () => {
    expect(DEFAULT_OPEN_WORKER_AGENT_SECTIONS).toEqual(["testing", "cleanup", "refactor"]);
  });
});
