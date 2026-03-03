"use client";

/**
 * Project Plan Tab: displays Cursor CLI plan mode output and questions.
 * Users can review the plan and then start agent implementation.
 */
import { useState, useCallback, useMemo, useEffect } from "react";
import type { Project } from "@/types/project";
import type { RunInfo } from "@/types/run";
import { useRunStore } from "@/store/run-store";
import { toast } from "sonner";
import {
  ListChecks,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkerAgentCard } from "@/components/molecules/CardsAndDisplay/WorkerAgentCard";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { formatElapsed } from "@/lib/run-helpers";

interface ProjectPlanTabProps {
  project: Project;
  projectId: string;
  agentProvider?: "cursor" | "claude" | "gemini";
}

const PLAN_PROMPT_PREFIX =
  "Design the approach first. Create a plan (steps, files, and code references). Do not execute yet—only produce the plan. Then the user can approve and run execution separately.\n\n";

export function ProjectPlanTab({ project, projectId, agentProvider = "cursor" }: ProjectPlanTabProps) {
  const runningRuns = useRunStore((s) => s.runningRuns);
  const terminalOutputHistory = useRunStore((s) => s.terminalOutputHistory);
  const runTempTicket = useRunStore((s) => s.runTempTicket);
  const removeTerminalOutputFromHistory = useRunStore((s) => s.removeTerminalOutputFromHistory);

  const [planInput, setPlanInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [implementingRunId, setImplementingRunId] = useState<string | null>(null);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());

  const projectPath = project?.repoPath ?? "";

  const planModeRuns = useMemo(() => {
    return runningRuns.filter((r) => r.meta?.agentMode === "plan");
  }, [runningRuns]);

  const planModeHistory = useMemo(() => {
    return terminalOutputHistory.filter((entry) => {
      const run = runningRuns.find((r) => r.runId === entry.runId);
      return run?.meta?.agentMode === "plan" || entry.label.startsWith("Plan:");
    });
  }, [terminalOutputHistory, runningRuns]);

  const handlePlan = useCallback(async () => {
    const text = planInput.trim();
    if (!text) {
      toast.error("Enter what you want to plan above, then run the agent.");
      return;
    }
    if (!projectPath?.trim()) {
      toast.error("Project path is missing. Set the project repo path in project details.");
      return;
    }
    const labelSuffix = text.length > 40 ? `${text.slice(0, 37)}…` : text;
    const label = `Plan: ${labelSuffix}`;
    setLoading(true);
    try {
      const fullPrompt = PLAN_PROMPT_PREFIX + text;
      const runId = await runTempTicket(projectPath.trim(), fullPrompt, label, { agentMode: "plan", provider: agentProvider });
      if (runId) {
        toast.success(
          runId === "queued"
            ? "Added to queue. Agent will start when a slot is free."
            : "Plan agent started. Check the output below."
        );
        setPlanInput("");
      } else {
        toast.error("Failed to start plan agent.");
      }
    } catch {
      toast.error("Failed to start plan agent.");
    } finally {
      setLoading(false);
    }
  }, [planInput, projectPath, runTempTicket]);

  const handleImplementPlan = useCallback(
    async (planOutput: string, planLabel: string) => {
      if (!projectPath?.trim()) {
        toast.error("Project path is missing.");
        return;
      }
      setImplementingRunId(planLabel);
      try {
        const implementPrompt = `Execute the following plan. The plan was reviewed and approved by the user.\n\n---\n\n${planOutput}`;
        const label = `Implement: ${planLabel.replace("Plan: ", "").slice(0, 30)}…`;
        const runId = await runTempTicket(projectPath.trim(), implementPrompt, label, {
          agentMode: "agent",
          provider: agentProvider,
        });
        if (runId) {
          toast.success(
            runId === "queued"
              ? "Implementation queued. Agent will start when a slot is free."
              : "Implementation started!"
          );
        } else {
          toast.error("Failed to start implementation.");
        }
      } catch {
        toast.error("Failed to start implementation.");
      } finally {
        setImplementingRunId(null);
      }
    },
    [projectPath, runTempTicket]
  );

  const toggleExpanded = (id: string) => {
    setExpandedRuns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyOutput = async (output: string) => {
    const ok = await copyTextToClipboard(output);
    if (ok) {
      toast.success("Output copied to clipboard.");
    } else {
      toast.error("Failed to copy output.");
    }
  };

  return (
    <div className="space-y-6">
      <WorkerAgentCard
        bgColor="bg-amber-500/[0.06]"
        iconBg="bg-amber-500/10"
        iconColor="text-amber-400"
        icon={ListChecks}
        title="Planning"
        description="Describe what you want to build. The agent creates a plan (no execution) for your review."
        value={planInput}
        onChange={setPlanInput}
        placeholder="e.g. Add dark mode toggle and refactor the settings page to use a card layout"
        buttonLabel="Create Plan"
        buttonTitle="Run the terminal agent in plan mode (design approach first, no execution)"
        onSubmit={handlePlan}
        loading={loading}
        disabled={!planInput.trim()}
      >
        <div className="space-y-6 mt-3">
      {/* Active Plan Runs */}
      {planModeRuns.length > 0 && (
        <div className="rounded-2xl surface-card border border-border/50 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
            <div className="flex items-center justify-center size-7 rounded-lg bg-amber-500/10">
              <Clock className="size-3.5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground tracking-tight">
                Running Plans
              </h3>
              <p className="text-[10px] text-muted-foreground normal-case">
                Plans currently being generated by the agent
              </p>
            </div>
          </div>
          <div className="px-5 pb-5 space-y-3">
            {planModeRuns.map((run) => (
              <ActivePlanRunCard key={run.runId} run={run} />
            ))}
          </div>
        </div>
      )}

      {/* Plan History / Completed Plans — only when there is data */}
      {planModeHistory.length > 0 && (
        <div className="rounded-2xl surface-card border border-border/50 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
            <div className="flex items-center justify-center size-7 rounded-lg bg-sky-500/10">
              <CheckCircle2 className="size-3.5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground tracking-tight">
                Completed Plans
              </h3>
              <p className="text-[10px] text-muted-foreground normal-case">
                Review completed plans and start implementation
              </p>
            </div>
          </div>
          <div className="px-5 pb-5">
            <div className="space-y-3">
              {planModeHistory.map((entry) => {
                const isExpanded = expandedRuns.has(entry.id);
                const isSuccess = entry.exitCode === undefined || entry.exitCode === 0;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "rounded-lg border bg-muted/30 overflow-hidden",
                      isSuccess ? "border-sky-500/30" : "border-red-500/30"
                    )}
                  >
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {isSuccess ? (
                          <CheckCircle2 className="size-4 text-sky-500 shrink-0" />
                        ) : (
                          <XCircle className="size-4 text-red-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{entry.label}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleString()}
                            {entry.durationMs != null && (
                              <span className="ml-2">
                                Duration: {formatElapsed(entry.durationMs)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => copyOutput(entry.output)}
                          title="Copy plan output"
                        >
                          <Copy className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => toggleExpanded(entry.id)}
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="size-3" />
                          ) : (
                            <ChevronDown className="size-3" />
                          )}
                        </Button>
                        {isSuccess && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 px-3 gap-1.5 bg-sky-500 hover:bg-sky-600 text-sky-50 text-xs"
                            onClick={() => handleImplementPlan(entry.output, entry.label)}
                            disabled={implementingRunId === entry.label}
                            title="Start agent to implement this plan"
                          >
                            {implementingRunId === entry.label ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Zap className="size-3" />
                            )}
                            Implement
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-red-400 hover:text-red-500"
                          onClick={() => removeTerminalOutputFromHistory(entry.id)}
                          title="Remove from history"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-border/50 px-4 py-3">
                        <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                          {entry.output || "(No output)"}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
        </div>
      </WorkerAgentCard>
    </div>
  );
}

function ActivePlanRunCard({ run }: { run: RunInfo }) {
  const elapsed = run.startedAt ? Date.now() - run.startedAt : 0;
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (run.status === "running") {
      const interval = setInterval(() => forceUpdate((n) => n + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [run.status]);

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 text-amber-400 animate-spin" />
          <span className="text-xs font-medium">{run.label}</span>
        </div>
        <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
          {formatElapsed(elapsed)}
        </Badge>
      </div>
      <div className="rounded bg-muted/50 p-3 max-h-[200px] overflow-y-auto">
        <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
          {run.logLines.length > 0 ? run.logLines.slice(-20).join("\n") : "Waiting for output..."}
        </pre>
      </div>
    </div>
  );
}
