export type WorkerAgentStatus = "idle" | "running" | "stopped";
export type WorkerAgentTabId = "testing" | "cleanup-refactor" | "night-shift";
type WorkerAgentPromptInfo = {
  title: string;
  path: string;
  description: string;
};

export const WORKER_AGENT_TABS: ReadonlyArray<{
  id: WorkerAgentTabId;
  label: "Testing Agent" | "Cleanup + Refactor" | "Night Shift";
}> = [
  { id: "testing", label: "Testing Agent" },
  { id: "cleanup-refactor", label: "Cleanup + Refactor" },
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

const WORKER_AGENT_PROMPT_INFO_BY_TAB: Partial<Record<WorkerAgentTabId, WorkerAgentPromptInfo>> = {
  testing: {
    title: "Testing Agent Prompt",
    path: "data/prompts/workflows/testing-agent.prompt.json",
    description: "Generates and runs a continuous test-focused iteration loop from project context.",
  },
  "cleanup-refactor": {
    title: "Cleanup + Refactor Prompt",
    path: "data/prompts/workflows/cleanup-refactor-agent.prompt.json",
    description:
      "Generates and runs a continuous cleanup/refactor loop based on selected Quality focus criteria.",
  },
};

export function getWorkerAgentPromptInfo(tabId: WorkerAgentTabId): WorkerAgentPromptInfo | null {
  return WORKER_AGENT_PROMPT_INFO_BY_TAB[tabId] ?? null;
}
