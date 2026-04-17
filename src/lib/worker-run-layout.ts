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
  status: "rounded-2xl border border-sky-500/20 overflow-hidden bg-gradient-to-br from-sky-500/[0.12] via-cyan-500/[0.08] to-teal-500/[0.1]",
  queue: "rounded-2xl border border-violet-500/20 overflow-hidden bg-gradient-to-br from-violet-500/[0.12] via-purple-500/[0.08] to-fuchsia-500/[0.1]",
  agents: "rounded-2xl border border-cyan-500/20 overflow-hidden bg-gradient-to-br from-cyan-500/[0.12] via-indigo-500/[0.08] to-violet-500/[0.1]",
  vibing: "rounded-2xl border border-indigo-500/20 overflow-hidden bg-gradient-to-br from-indigo-500/[0.12] via-violet-500/[0.08] to-fuchsia-500/[0.1]",
  enhancements: "rounded-2xl border border-violet-500/20 overflow-hidden bg-gradient-to-br from-violet-500/[0.12] via-purple-500/[0.08] to-indigo-500/[0.1]",
  "terminal-output":
    "rounded-2xl border border-teal-500/20 overflow-hidden bg-gradient-to-br from-teal-500/[0.12] via-cyan-500/[0.08] to-emerald-500/[0.1]",
  history: "rounded-2xl border border-slate-500/20 overflow-hidden bg-gradient-to-br from-slate-500/[0.12] via-zinc-500/[0.08] to-stone-500/[0.1]",
  "night-shift":
    "rounded-2xl border border-purple-500/20 overflow-hidden bg-gradient-to-br from-purple-500/[0.12] via-violet-500/[0.08] to-fuchsia-500/[0.1]",
};
