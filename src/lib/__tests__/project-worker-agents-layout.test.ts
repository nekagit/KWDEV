import { describe, expect, it } from "vitest";
import {
  getWorkerAgentStatusMeta,
  WORKER_AGENT_NIGHT_SHIFT_CARD_CLASSNAME,
  WORKER_AGENT_ACTIONS_ROW_CLASSNAME,
  WORKER_AGENT_TABS,
} from "@/lib/project-worker-agents-layout";

describe("project worker agents layout", () => {
  it("maps running status to running label and cyan tone", () => {
    expect(getWorkerAgentStatusMeta("running")).toEqual({
      label: "Running",
      toneClassName: "text-cyan-200 border-cyan-500/40 bg-cyan-500/15",
    });
  });

  it("maps stopped status to stopped label and amber tone", () => {
    expect(getWorkerAgentStatusMeta("stopped")).toEqual({
      label: "Stopped",
      toneClassName: "text-amber-200 border-amber-500/40 bg-amber-500/15",
    });
  });

  it("maps idle status to neutral tone", () => {
    expect(getWorkerAgentStatusMeta("idle")).toEqual({
      label: "Idle",
      toneClassName: "text-muted-foreground border-border/60 bg-background/60",
    });
  });

  it("keeps actions in a single horizontal line on desktop", () => {
    expect(WORKER_AGENT_ACTIONS_ROW_CLASSNAME).toContain("md:flex-nowrap");
  });

  it("keeps each agent section in its own tab", () => {
    expect(WORKER_AGENT_TABS.map((tab) => tab.id)).toEqual(["testing", "cleanup", "refactor", "night-shift"]);
  });

  it("uses a flat bordered card style for night shift content", () => {
    expect(WORKER_AGENT_NIGHT_SHIFT_CARD_CLASSNAME).toContain("border-cyan-500/20");
    expect(WORKER_AGENT_NIGHT_SHIFT_CARD_CLASSNAME).toContain("bg-cyan-500/[0.08]");
  });
});
