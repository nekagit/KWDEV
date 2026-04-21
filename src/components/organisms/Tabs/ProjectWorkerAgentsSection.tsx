"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Bot, CircleHelp, Loader2, Moon, PauseCircle, Play, TestTube2, Wrench } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRunStore } from "@/store/run-store";
import { getProjectConfig, readProjectPromptJsonOrEmpty } from "@/lib/api-projects";
import type { Project } from "@/types/project";
import { toast } from "sonner";
import { isTauri } from "@/lib/tauri";
import {
  WORKER_AGENT_ACTIONS_ROW_CLASSNAME,
  WORKER_AGENT_NIGHT_SHIFT_CARD_CLASSNAME,
  WORKER_AGENT_TABS,
  getWorkerAgentStatusMeta,
  getWorkerAgentPromptInfo,
} from "@/lib/project-worker-agents-layout";
import type { WorkerAgentIteration } from "@/lib/worker-agent-loop";
import { buildTestingAgentPrompt } from "@/lib/testing-agent-prompt";
import { buildCleanupRefactorAgentPrompt } from "@/lib/worker-agent-prompts";
import {
  getWorkerEnhancementToolLabelsByIds,
  sanitizeWorkerEnhancementToolIds,
} from "@/lib/worker-enhancements-tools";

const TESTING_AGENT_PROMPT_PATH = "data/prompts/workflows/testing-agent.prompt.json";
const CLEANUP_REFACTOR_AGENT_PROMPT_PATH = "data/prompts/workflows/cleanup-refactor-agent.prompt.json";

function resolveStatus(active: boolean, status: "idle" | "running" | "stopped"): "idle" | "running" | "stopped" {
  if (active || status === "running") return "running";
  if (status === "stopped") return "stopped";
  return "idle";
}

function AgentPromptInfoIcon({ tabId }: { tabId: "testing" | "cleanup-refactor" }) {
  const promptInfo = getWorkerAgentPromptInfo(tabId);
  if (!promptInfo) return null;

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`${promptInfo.title} info`}
            title={`View ${promptInfo.title}`}
          >
            <CircleHelp className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs space-y-1.5">
          <p className="font-semibold">{promptInfo.title}</p>
          <p className="text-[11px] text-primary-foreground/90">{promptInfo.description}</p>
          <p className="text-[10px] font-mono text-primary-foreground/80">{promptInfo.path}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ProjectWorkerAgentsSection({
  project,
  projectId,
  projectPath,
  agentProvider = "cursor",
  nightShiftContent,
}: {
  project: Project;
  projectId: string;
  projectPath: string;
  agentProvider?: "cursor" | "claude" | "gemini";
  nightShiftContent?: ReactNode;
}) {
  const [startingTesting, setStartingTesting] = useState(false);
  const [startingCleanupRefactor, setStartingCleanupRefactor] = useState(false);
  const runTempTicket = useRunStore((s) => s.runTempTicket);

  const testingAgentActive = useRunStore((s) => s.testingAgentActive);
  const testingAgentStatus = useRunStore((s) => s.testingAgentStatus);
  const testingAgentIterations = useRunStore((s) => s.testingAgentIterations);
  const setTestingAgentActive = useRunStore((s) => s.setTestingAgentActive);
  const setTestingAgentReplenishCallback = useRunStore((s) => s.setTestingAgentReplenishCallback);
  const startTestingAgentLoop = useRunStore((s) => s.startTestingAgentLoop);
  const stopTestingAgentLoop = useRunStore((s) => s.stopTestingAgentLoop);
  const clearTestingAgentIterations = useRunStore((s) => s.clearTestingAgentIterations);
  const cleanupAgentActive = useRunStore((s) => s.cleanupAgentActive);
  const cleanupAgentStatus = useRunStore((s) => s.cleanupAgentStatus);
  const cleanupAgentIterations = useRunStore((s) => s.cleanupAgentIterations);
  const setCleanupAgentActive = useRunStore((s) => s.setCleanupAgentActive);
  const setCleanupAgentReplenishCallback = useRunStore((s) => s.setCleanupAgentReplenishCallback);
  const startCleanupAgentLoop = useRunStore((s) => s.startCleanupAgentLoop);
  const stopCleanupAgentLoop = useRunStore((s) => s.stopCleanupAgentLoop);
  const clearCleanupAgentIterations = useRunStore((s) => s.clearCleanupAgentIterations);
  const [qualityFocusLabels, setQualityFocusLabels] = useState<string[]>([]);

  useEffect(() => {
    if (!isTauri) return;
    let cancelled = false;
    getProjectConfig(projectId, "cleanup_refactor_tools" as never)
      .then((res) => {
        if (cancelled) return;
        const toolIds = sanitizeWorkerEnhancementToolIds(res.config?.toolIds);
        setQualityFocusLabels(getWorkerEnhancementToolLabelsByIds(toolIds));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const launchTestingIteration = useCallback(
    async (slot: 1 | 2 | 3 = 1) => {
      if (!projectPath?.trim()) return;
      const template = await readProjectPromptJsonOrEmpty(projectId, TESTING_AGENT_PROMPT_PATH, projectPath);
      const iterationId = `testing-agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nextIndex = testingAgentIterations.length + 1;
      const prompt = buildTestingAgentPrompt(project, template ?? "", nextIndex);
      startTestingAgentLoop({
        id: iterationId,
        startedAt: Date.now(),
        prompt,
      });
      await runTempTicket(projectPath, prompt, `Testing agent (Terminal ${slot})`, {
        isTestingAgent: true,
        testingAgentIterationId: iterationId,
        provider: agentProvider,
      });
    },
    [agentProvider, project, projectId, projectPath, runTempTicket, startTestingAgentLoop, testingAgentIterations.length]
  );

  const launchCleanupRefactorIteration = useCallback(
    async (slot: 1 | 2 | 3 = 1) => {
      if (!projectPath?.trim()) return;
      const template = await readProjectPromptJsonOrEmpty(
        projectId,
        CLEANUP_REFACTOR_AGENT_PROMPT_PATH,
        projectPath
      );
      const iterationId = `cleanup-agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nextIndex = cleanupAgentIterations.length + 1;
      const prompt = buildCleanupRefactorAgentPrompt(
        project,
        template ?? "",
        nextIndex,
        qualityFocusLabels
      );
      const iteration: WorkerAgentIteration = {
        id: iterationId,
        startedAt: Date.now(),
        prompt,
      };
      startCleanupAgentLoop(iteration);
      await runTempTicket(projectPath, prompt, `Cleanup agent (Terminal ${slot})`, {
        isCleanupAgent: true,
        cleanupAgentIterationId: iterationId,
        provider: agentProvider,
      });
    },
    [
      agentProvider,
      cleanupAgentIterations.length,
      project,
      projectId,
      projectPath,
      qualityFocusLabels,
      runTempTicket,
      startCleanupAgentLoop,
    ]
  );

  const handleStartTesting = useCallback(async () => {
    if (!projectPath?.trim()) return;
    setStartingTesting(true);
    try {
      setTestingAgentActive(true);
      setTestingAgentReplenishCallback(async (slot) => {
        await launchTestingIteration(slot);
      });
      await launchTestingIteration(1);
      toast.success("Testing Agent started. It will continue until stopped.");
    } catch (e) {
      setTestingAgentActive(false);
      setTestingAgentReplenishCallback(null);
      toast.error(e instanceof Error ? e.message : "Failed to start Testing Agent.");
    } finally {
      setStartingTesting(false);
    }
  }, [launchTestingIteration, projectPath, setTestingAgentActive, setTestingAgentReplenishCallback]);

  const handleStopTesting = useCallback(() => {
    stopTestingAgentLoop();
    toast.success("Testing Agent stopped. Current run can finish, no new iteration will start.");
  }, [stopTestingAgentLoop]);

  const handleStartCleanupRefactor = useCallback(async () => {
    if (!projectPath?.trim()) return;
    setStartingCleanupRefactor(true);
    try {
      setCleanupAgentActive(true);
      setCleanupAgentReplenishCallback(async (slot) => {
        await launchCleanupRefactorIteration(slot);
      });
      await launchCleanupRefactorIteration(1);
      toast.success("Cleanup + Refactor Agent started. It will continue until stopped.");
    } catch (e) {
      setCleanupAgentActive(false);
      setCleanupAgentReplenishCallback(null);
      toast.error(e instanceof Error ? e.message : "Failed to start Cleanup + Refactor Agent.");
    } finally {
      setStartingCleanupRefactor(false);
    }
  }, [launchCleanupRefactorIteration, projectPath, setCleanupAgentActive, setCleanupAgentReplenishCallback]);

  const handleStopCleanupRefactor = useCallback(() => {
    stopCleanupAgentLoop();
    toast.success("Cleanup + Refactor Agent stopped. Current run can finish, no new iteration will start.");
  }, [stopCleanupAgentLoop]);

  const testingStatus = resolveStatus(testingAgentActive, testingAgentStatus);
  const cleanupStatus = resolveStatus(cleanupAgentActive, cleanupAgentStatus);
  const canStartTesting = !testingAgentActive && !startingTesting && !!projectPath?.trim();
  const canStartCleanupRefactor = !cleanupAgentActive && !startingCleanupRefactor && !!projectPath?.trim();

  const handleRunAll = useCallback(async () => {
    const runs: Array<Promise<void>> = [];
    if (canStartTesting) runs.push(handleStartTesting());
    if (canStartCleanupRefactor) runs.push(handleStartCleanupRefactor());
    await Promise.all(runs);
    window.dispatchEvent(new CustomEvent("worker-run-night-shift-idea-driven"));
    toast.success("Run All started agents and triggered Night Shift idea-driven mode.");
  }, [
    canStartCleanupRefactor,
    canStartTesting,
    handleStartCleanupRefactor,
    handleStartTesting,
  ]);

  const cards = useMemo(
    () => ({
      cleanup: {
        key: "cleanup-refactor",
        status: cleanupStatus,
        subtitle: "Combined cleanup and refactor workflow loop guided by selected Quality criteria.",
      },
      testing: { key: "testing", status: testingStatus, subtitle: "Continuous testing loop with iteration output." },
    }),
    [cleanupStatus, testingStatus]
  );

  const providerLabel = agentProvider === "claude" ? "Claude" : agentProvider === "gemini" ? "Gemini" : "Cursor";
  const testingIterationsNewestFirst = useMemo(
    () => [...testingAgentIterations].sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0)),
    [testingAgentIterations]
  );
  const cleanupIterationsNewestFirst = useMemo(
    () => [...cleanupAgentIterations].sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0)),
    [cleanupAgentIterations]
  );
  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden bg-muted/30">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-7 shrink-0 rounded-lg bg-muted">
              <Bot className="size-3.5 text-foreground/80" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-foreground tracking-tight">Agents</h3>
              <p className="text-[10px] text-muted-foreground normal-case">
                {providerLabel}, Testing, and workflow agents in a streamlined layout.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-foreground text-background hover:bg-foreground/90"
            onClick={() => void handleRunAll()}
            disabled={!projectPath?.trim()}
            title="Run Testing, Cleanup + Refactor, and Night Shift (idea-driven)"
          >
            <Play className="size-3.5" />
            Run All
          </Button>
        </div>
      </div>
      <div className="px-5 pb-5">
        <Tabs defaultValue="testing" className="w-full">
          <TabsList className="flex w-full h-9 rounded-lg bg-muted p-1 gap-0.5">
            {WORKER_AGENT_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex-1 min-w-0 text-xs rounded-md truncate">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="testing" className="mt-4 px-0 pt-0">
            <div className="rounded-xl border border-border/60 bg-card p-3 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                    <TestTube2 className="size-3.5 text-foreground/80" />
                    Testing Agent
                    <AgentPromptInfoIcon tabId="testing" />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{cards.testing.subtitle}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${getWorkerAgentStatusMeta(cards.testing.status).toneClassName}`}>
                  {cards.testing.status === "running" ? <Loader2 className="size-3.5 animate-spin" /> : <PauseCircle className="size-3.5" />}
                  {getWorkerAgentStatusMeta(cards.testing.status).label}
                </span>
              </div>
              <div className={WORKER_AGENT_ACTIONS_ROW_CLASSNAME}>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-foreground text-background hover:bg-foreground/90"
                  disabled={!canStartTesting}
                  onClick={() => void handleStartTesting()}
                >
                  {startingTesting ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                  Start Agent
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  disabled={!testingAgentActive}
                  onClick={handleStopTesting}
                >
                  <PauseCircle className="size-3.5" />
                  Stop
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs"
                  disabled={testingIterationsNewestFirst.length === 0}
                  onClick={clearTestingAgentIterations}
                >
                  Clear output
                </Button>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium mb-2">
                  <TestTube2 className="size-3.5 text-foreground/80" />
                  Testing loop output
                </div>
                {testingIterationsNewestFirst.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No iterations yet. Start the Testing Agent to begin the loop.</p>
                ) : (
                  <ScrollArea className="h-[320px] pr-2">
                    <div className="space-y-3">
                      {testingIterationsNewestFirst.map((item, idx) => (
                        <div key={item.id} className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                          <div className="text-xs font-semibold text-foreground">
                            Iteration {testingIterationsNewestFirst.length - idx}
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-muted-foreground mb-1">Generated Prompt</p>
                            <pre className="text-[11px] whitespace-pre-wrap break-words font-mono bg-muted/40 rounded-md p-2">
                              {item.prompt}
                            </pre>
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-muted-foreground mb-1">Execution Result</p>
                            <pre className="text-[11px] whitespace-pre-wrap break-words font-mono bg-muted/40 rounded-md p-2">
                              {item.executionResult ?? "Waiting for run completion..."}
                            </pre>
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-muted-foreground mb-1">Created Tests</p>
                            <pre className="text-[11px] whitespace-pre-wrap break-words font-mono bg-muted/40 rounded-md p-2">
                              {item.createdTests ?? "Waiting for test artifact extraction..."}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cleanup-refactor" className="mt-4 px-0 pt-0">
            <div className="rounded-xl border border-border/60 bg-card p-3 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
                    <Wrench className="size-3.5 text-foreground/80" />
                    Cleanup + Refactor Agent
                    <AgentPromptInfoIcon tabId="cleanup-refactor" />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{cards.cleanup.subtitle}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${getWorkerAgentStatusMeta(cards.cleanup.status).toneClassName}`}>
                  {cards.cleanup.status === "running" ? <Loader2 className="size-3.5 animate-spin" /> : <PauseCircle className="size-3.5" />}
                  {getWorkerAgentStatusMeta(cards.cleanup.status).label}
                </span>
              </div>
              <div className={WORKER_AGENT_ACTIONS_ROW_CLASSNAME}>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-foreground text-background hover:bg-foreground/90"
                  disabled={!canStartCleanupRefactor}
                  onClick={() => void handleStartCleanupRefactor()}
                >
                  {startingCleanupRefactor ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                  Start Agent
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  disabled={!cleanupAgentActive}
                  onClick={handleStopCleanupRefactor}
                >
                  <PauseCircle className="size-3.5" />
                  Stop
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs"
                  disabled={cleanupIterationsNewestFirst.length === 0}
                  onClick={clearCleanupAgentIterations}
                >
                  Clear output
                </Button>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium mb-2">
                  <Wrench className="size-3.5 text-foreground/80" />
                  Cleanup + refactor loop output
                </div>
                {qualityFocusLabels.length > 0 ? (
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Focus: {qualityFocusLabels.join(", ")}
                  </p>
                ) : null}
                {cleanupIterationsNewestFirst.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No iterations yet. Start the Cleanup + Refactor Agent to begin the loop.</p>
                ) : (
                  <ScrollArea className="h-[320px] pr-2">
                    <div className="space-y-3">
                      {cleanupIterationsNewestFirst.map((item, idx) => (
                        <div key={item.id} className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                          <div className="text-xs font-semibold text-foreground">
                            Iteration {cleanupIterationsNewestFirst.length - idx}
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-muted-foreground mb-1">Generated Prompt</p>
                            <pre className="text-[11px] whitespace-pre-wrap break-words font-mono bg-muted/40 rounded-md p-2">
                              {item.prompt}
                            </pre>
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-muted-foreground mb-1">Execution Result</p>
                            <pre className="text-[11px] whitespace-pre-wrap break-words font-mono bg-muted/40 rounded-md p-2">
                              {item.executionResult ?? "Waiting for run completion..."}
                            </pre>
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-muted-foreground mb-1">Changed Artifacts</p>
                            <pre className="text-[11px] whitespace-pre-wrap break-words font-mono bg-muted/40 rounded-md p-2">
                              {item.createdArtifacts ?? "Waiting for cleanup/refactor artifact extraction..."}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="night-shift" forceMount className="mt-4 px-0 pt-0">
            {nightShiftContent ?? (
              <div className={WORKER_AGENT_NIGHT_SHIFT_CARD_CLASSNAME}>
                <div className="inline-flex items-center gap-2 text-xs font-semibold mb-2">
                  <Moon className="size-3.5 text-foreground/80" />
                  Night Shift
                </div>
                <p className="text-[11px] text-muted-foreground">Night Shift content is not available in this context.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
