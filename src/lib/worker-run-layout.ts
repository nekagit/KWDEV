export function getWorkerRunSectionsGridClassName(openCount: number): string {
  if (openCount >= 2) return "grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 transition-all duration-300 ease-out";
  return "grid grid-cols-1 lg:grid-cols-1 gap-4 lg:gap-5 transition-all duration-300 ease-out";
}

export const WORKER_RUN_SECTION_CARD_CLASSNAME =
  "rounded-2xl bg-card/65 p-4 transition-all duration-300 ease-out motion-reduce:transition-none";

export type WorkerRunSectionSurfaceId =
  | "status"
  | "queue"
  | "agents"
  | "vibing"
  | "enhancements"
  | "terminal-output"
  | "history"
  | "night-shift";

export const WORKER_RUN_SECTION_SURFACE_CLASSNAME: Record<WorkerRunSectionSurfaceId, string> = {
  status: "rounded-2xl border border-border/60 overflow-hidden bg-muted/30",
  queue: "rounded-2xl border border-border/60 overflow-hidden bg-muted/30",
  agents: "rounded-2xl border border-border/60 overflow-hidden bg-muted/30",
  vibing: "rounded-2xl border border-border/60 overflow-hidden bg-muted/30",
  enhancements: "rounded-2xl border border-border/60 overflow-hidden bg-muted/30",
  "terminal-output": "rounded-2xl border border-border/60 overflow-hidden bg-muted/30",
  history: "rounded-2xl border border-border/60 overflow-hidden bg-muted/30",
  "night-shift": "rounded-2xl border border-border/60 overflow-hidden bg-muted/30",
};
