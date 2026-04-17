export type WorkerAgentStatus = "idle" | "running" | "stopped";
export type WorkerAgentTabId = "testing" | "cleanup" | "refactor" | "night-shift";

export const WORKER_AGENT_TABS: ReadonlyArray<{
  id: WorkerAgentTabId;
  label: "Testing Agent" | "Cleanup Agent" | "Refactor Agent" | "Night Shift";
}> = [
  { id: "testing", label: "Testing Agent" },
  { id: "cleanup", label: "Cleanup Agent" },
  { id: "refactor", label: "Refactor Agent" },
  { id: "night-shift", label: "Night Shift" },
];

export function getWorkerAgentStatusMeta(status: WorkerAgentStatus): {
  label: "Idle" | "Running" | "Stopped";
  toneClassName: string;
} {
  if (status === "running") {
    return {
      label: "Running",
      toneClassName: "text-cyan-200 border-cyan-500/40 bg-cyan-500/15",
    };
  }
  if (status === "stopped") {
    return {
      label: "Stopped",
      toneClassName: "text-amber-200 border-amber-500/40 bg-amber-500/15",
    };
  }
  return {
    label: "Idle",
    toneClassName: "text-muted-foreground border-border/60 bg-background/60",
  };
}

export const WORKER_AGENT_ACTIONS_ROW_CLASSNAME = "flex flex-wrap md:flex-nowrap items-center gap-2";
export const WORKER_AGENT_NIGHT_SHIFT_CARD_CLASSNAME =
  "rounded-xl border border-cyan-500/20 bg-cyan-500/[0.08] p-3";
