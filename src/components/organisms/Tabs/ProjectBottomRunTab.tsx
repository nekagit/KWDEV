"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Monitor, Play, RefreshCw, Square, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { isTauri } from "@/lib/tauri";
import { readProjectFileOrEmpty, updateProject } from "@/lib/api-projects";
import { useRunStore } from "@/store/run-store";
import type { Project } from "@/types/project";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TerminalSlot } from "@/components/molecules/Display/TerminalSlot";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function getPortFromLocalUrl(url: string): number | null {
  const m = url.match(/:(\d+)(?:\/|$)/);
  return m ? parseInt(m[1], 10) : null;
}

type ProjectBottomRunTabProps = {
  project: Project;
  projectId: string;
  portInput: string;
  onPortInputChange: (value: string) => void;
  savingPort: boolean;
  onOpenRunningModal: (port: number) => void;
  onProjectUpdate?: () => void;
};

export function ProjectBottomRunTab({
  project,
  projectId,
  portInput,
  onPortInputChange,
  savingPort,
  onOpenRunningModal,
  onProjectUpdate,
}: ProjectBottomRunTabProps) {
  const runNpmScript = useRunStore((s) => s.runNpmScript);
  const stopRun = useRunStore((s) => s.stopRun);
  const runningRuns = useRunStore((s) => s.runningRuns);
  const [scripts, setScripts] = useState<Record<string, string>>({});
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [scriptsExpanded, setScriptsExpanded] = useState(false);
  const [terminalExpanded, setTerminalExpanded] = useState(true);
  const scriptsCancelledRef = useRef(false);

  const loadScripts = useCallback((): Promise<void> => {
    if (!project.repoPath) {
      setScripts({});
      return Promise.resolve();
    }
    scriptsCancelledRef.current = false;
    setLoadingScripts(true);
    return readProjectFileOrEmpty(projectId, "package.json", project.repoPath)
      .then((raw) => {
        if (scriptsCancelledRef.current) return;
        try {
          const pkg = raw?.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {};
          const scriptMap = pkg.scripts as Record<string, string> | undefined;
          setScripts(scriptMap && typeof scriptMap === "object" ? scriptMap : {});
        } catch {
          setScripts({});
        }
      })
      .finally(() => {
        if (!scriptsCancelledRef.current) setLoadingScripts(false);
      });
  }, [projectId, project.repoPath]);

  useEffect(() => {
    scriptsCancelledRef.current = false;
    void loadScripts();
    return () => {
      scriptsCancelledRef.current = true;
    };
  }, [loadScripts]);

  const parsedPortInput = parseInt(portInput.trim(), 10);
  const hasValidPortInput =
    !Number.isNaN(parsedPortInput) && parsedPortInput >= 1 && parsedPortInput <= 65535;
  const latestNpmRun = [...runningRuns]
    .reverse()
    .find((r) => r.label.startsWith("npm run "));
  const activeRun = lastRunId
    ? runningRuns.find((r) => r.runId === lastRunId) ?? latestNpmRun ?? null
    : latestNpmRun ?? null;

  return (
    <ScrollArea className="h-[calc(100vh-14rem)] w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-full min-w-0 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden p-5 pr-4 space-y-4">
        <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0 flex-wrap">
            <h3 className="text-sm font-semibold">Run</h3>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              title={hasValidPortInput ? "Open running app" : "Enter a valid port first"}
              onClick={() => onOpenRunningModal(parsedPortInput)}
              disabled={!hasValidPortInput}
            >
              <Monitor className="size-3.5" />
              Open running app
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter the local port you want to open in the running app preview.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={1}
              max={65535}
              placeholder="Port"
              value={portInput}
              onChange={(e) => onPortInputChange(e.target.value)}
              className="h-8 w-28 text-xs font-mono"
            />
            {savingPort ? <Loader2 className="size-3 animate-spin text-muted-foreground" /> : null}
          </div>
        </div>

        <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-3 min-w-0">
          <div className="flex items-start justify-between gap-3 min-w-0 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold">Scripts</h3>
            </div>
            <div className="flex items-center gap-2 min-w-0 flex-wrap justify-end">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 gap-1.5 text-xs"
                      disabled={loadingScripts || !project.repoPath}
                      onClick={() => {
                        loadScripts()
                          .then(() => toast.success("Scripts refreshed"))
                          .catch(() => toast.error("Failed to load scripts"));
                      }}
                      aria-label="Reload scripts from package.json"
                    >
                      <RefreshCw className={cn("size-3.5", loadingScripts && "animate-spin")} />
                      Refresh
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reload scripts from package.json</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 gap-1.5 text-xs"
                onClick={() => setScriptsExpanded((value) => !value)}
              >
                {scriptsExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                {scriptsExpanded ? "Collapse scripts" : "Open scripts"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Run npm scripts from the project directory. Output streams directly into the terminal panel below.
          </p>

          {scriptsExpanded &&
            (loadingScripts ? (
              <div className="flex items-center gap-2 py-3 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-xs">Loading package.json...</span>
              </div>
            ) : Object.keys(scripts).length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 rounded-lg border border-border/40 bg-muted/10 px-3">
                No package.json scripts found.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 min-w-0 max-w-full overflow-x-hidden">
                {Object.keys(scripts).map((name) => {
                  const canRun = isTauri && !!project.repoPath;
                  return (
                    <Button
                      key={name}
                      variant="outline"
                      size="sm"
                      className="min-w-0 max-w-full gap-1.5 text-xs break-all !whitespace-normal h-auto py-1.5 overflow-hidden"
                      disabled={!canRun}
                      onClick={async () => {
                        if (!project.repoPath || !canRun) return;
                        try {
                          const runId = await runNpmScript(project.repoPath, name);
                          if (runId) {
                            setLastRunId(runId);
                            setTerminalExpanded(true);
                            toast.success("Running. Output below.");
                          } else {
                            const err = useRunStore.getState().error ?? "";
                            toast.error(err || "Failed to start script");
                          }
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed to start script");
                        }
                      }}
                    >
                      <Play className="size-3" />
                      <span className="min-w-0 break-all whitespace-normal">{name}</span>
                    </Button>
                  );
                })}
              </div>
            ))}
        </div>

        <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0 flex-wrap">
            <h3 className="text-sm font-semibold">Terminal output</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setTerminalExpanded((v) => !v)}
            >
              {terminalExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {terminalExpanded ? "Collapse terminal" : "Open terminal"}
            </Button>
          </div>

          {terminalExpanded && activeRun ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
                <span className="text-xs font-medium text-muted-foreground truncate min-w-0 flex-1">{activeRun.label}</span>
                <div className="flex items-center gap-2 min-w-0 flex-wrap justify-end">
                  {(() => {
                    const portFromUrl = activeRun.localUrl ? getPortFromLocalUrl(activeRun.localUrl) : null;
                    const canSavePort =
                      portFromUrl != null &&
                      (project.runPort == null || project.runPort !== portFromUrl);
                    if (!canSavePort) return null;
                    return (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        disabled={savingPort}
                        onClick={async () => {
                          if (portFromUrl == null) return;
                          try {
                            await updateProject(projectId, { runPort: portFromUrl });
                            onPortInputChange(String(portFromUrl));
                            onProjectUpdate?.();
                            toast.success("Run port saved from script output.");
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Failed to save port");
                          }
                        }}
                      >
                        Use detected port
                      </Button>
                    );
                  })()}
                  {activeRun.status === "running" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => stopRun(activeRun.runId)}
                    >
                      <Square className="size-3" />
                      Stop
                    </Button>
                  )}
                </div>
              </div>
              <TerminalSlot
                run={{
                  runId: activeRun.runId,
                  label: activeRun.label,
                  logLines: activeRun.logLines,
                  status: activeRun.status,
                  startedAt: activeRun.startedAt,
                  doneAt: activeRun.doneAt,
                  localUrl: activeRun.localUrl,
                }}
                slotIndex={0}
                heightClass="h-[260px]"
              />
            </div>
          ) : terminalExpanded ? (
            <p className="text-xs text-muted-foreground py-2">Run a script to see output here.</p>
          ) : null}
        </div>
      </div>
    </ScrollArea>
  );
}
