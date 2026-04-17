export type WorkerTopAppId = "agents" | "vibing" | "enhancements" | "terminal-output";

export const WORKER_TOP_APP_IDS: WorkerTopAppId[] = ["agents", "vibing", "enhancements", "terminal-output"];

export const TERMINAL_TOP_APP_LABEL = "Terminal";

export const WORKER_TOP_APPS_ROW_CLASSNAME =
  "flex flex-wrap items-stretch justify-center gap-3";

export function getWorkerTopAppButtonClassName(isActive: boolean, activeClassName: string): string {
  const baseClassName =
    "group flex min-w-[150px] flex-col items-center justify-center gap-2 rounded-2xl border-0 p-3 transition-all";
  if (isActive) return `${baseClassName} ${activeClassName} border-0`;
  return `${baseClassName} bg-transparent hover:bg-muted/45`;
}

export function getWorkerTopAppIconWrapClassName(isActive: boolean, iconBgClassName: string): string {
  if (!isActive) return "bg-muted/40 border-0";
  if (iconBgClassName.includes("bg-cyan-500/12")) return "bg-cyan-500/90 border-0 shadow-md";
  if (iconBgClassName.includes("bg-fuchsia-500/12")) return "bg-fuchsia-500/90 border-0 shadow-md";
  if (iconBgClassName.includes("bg-violet-500/12")) return "bg-violet-500/90 border-0 shadow-md";
  if (iconBgClassName.includes("bg-sky-500/12")) return "bg-sky-500/90 border-0 shadow-md";
  return "bg-primary border-0 shadow-md";
}
