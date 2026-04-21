"use client";

/** Terminal Run Dock component. */
import React from "react";
import { Square, X } from "lucide-react";
import { useRunStore } from "@/store/run-store";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

/**
 * Dock of small circles in the bottom-right. One circle per run in runningRuns.
 * Only visible when at least one run is running. Click opens floating terminal;
 * stop button stops the run, X removes the run from the dock.
 */
export function TerminalRunDock() {
  const runningRuns = useRunStore((s) => s.runningRuns);
  const floatingRunId = useRunStore((s) => s.floatingTerminalRunId);
  const setFloatingTerminalRunId = useRunStore((s) => s.setFloatingTerminalRunId);
  const setFloatingTerminalMinimized = useRunStore((s) => s.setFloatingTerminalMinimized);
  const stopRun = useRunStore((s) => s.stopRun);
  const removeRunFromDock = useRunStore((s) => s.removeRunFromDock);

  const handleCircleClick = (runId: string) => {
    setFloatingTerminalRunId(runId);
    setFloatingTerminalMinimized(false);
  };

  const hasRunning = runningRuns.some((r) => r.status === "running");
  const runningOnly = runningRuns.filter((r) => r.status === "running");

  if (!hasRunning) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-40 flex flex-col-reverse items-center gap-2"
      aria-label="Run terminals"
    >
      <TooltipProvider delayDuration={300}>
        {runningOnly.map((run) => {
          const isActive = run.runId === floatingRunId;
          return (
            <Tooltip key={run.runId}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCircleClick(run.runId)}
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
                      isActive
                        ? "border-primary bg-primary/20 shadow-lg shadow-primary/20"
                        : "border-border/60 bg-card/90 shadow-md hover:border-primary/50 hover:bg-card",
                      "ring-2 ring-sky-400/50 ring-offset-2 ring-offset-background"
                    )}
                    aria-label={`Open terminal: ${run.label}`}
                    aria-pressed={isActive}
                  >
                    <span className="size-2.5 rounded-full bg-sky-400 animate-pulse" />
                  </button>
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        stopRun(run.runId).catch(() => {});
                      }}
                      aria-label={`Stop ${run.label}`}
                      title="Stop run"
                    >
                      <Square className="size-3" strokeWidth={3} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRunFromDock(run.runId);
                      }}
                      aria-label={`Remove ${run.label} from dock`}
                      title="Remove from dock"
                    >
                      <X className="size-3" strokeWidth={2.5} />
                    </Button>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[200px]">
                <p className="text-xs font-medium truncate">{run.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  Running · Click to open terminal; stop or remove from dock
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
