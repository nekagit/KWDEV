"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Bot, Loader2, Moon, PauseCircle, Play, Sparkles, TestTube2, Wrench } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRunStore } from "@/store/run-store";
import { readProjectFileOrEmpty } from "@/lib/api-projects";
import type { Project } from "@/types/project";
import { toast } from "sonner";
import {
  WORKER_AGENT_ACTIONS_ROW_CLASSNAME,
  WORKER_AGENT_NIGHT_SHIFT_CARD_CLASSNAME,
  WORKER_AGENT_TABS,
  getWorkerAgentStatusMeta,
} from "@/lib/project-worker-agents-layout";
import type { WorkerAgentIteration } from "@/lib/worker-agent-loop";
import { buildTestingAgentPrompt } from "@/lib/testing-agent-prompt";
import { buildCleanupAgentPrompt, buildRefactorAgentPrompt } from "@/lib/worker-agent-prompts";

const TESTING_AGENT_PROMPT_PATH = "data/prompts/testing-agent.prompt.md";
const CLEANUP_AGENT_PROMPT_PATH = "data/prompts/cleanup-agent.prompt.md";
const REFACTOR_AGENT_PROMPT_PATH = "data/prompts/refactor-agent.prompt.md";

function resolveStatus(active: boolean, status: "idle" | "running" | "stopped"): "idle" | "running" | "stopped" {
  if (active || status === "running") return "running";
  if (status === "stopped") return "stopped";
  return "idle";
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
  const [startingCleanup, setStartingCleanup] = useState(false);
  const [startingRefactor, setStartingRefactor] = useState(false);
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
  const refactorAgentActive = useRunStore((s) => s.refactorAgentActive);
  const refactorAgentStatus = useRunStore((s) => s.refactorAgentStatus);
  const refactorAgentIterations = useRunStore((s) => s.refactorAgentIterations);
  const setRefactorAgentActive = useRunStore((s) => s.setRefactorAgentActive);
  const setRefactorAgentReplenishCallback = useRunStore((s) => s.setRefactorAgentReplenishCallback);
  const startRefactorAgentLoop = useRunStore((s) => s.startRefactorAgentLoop);
  const stopRefactorAgentLoop = useRunStore((s) => s.stopRefactorAgentLoop);
  const clearRefactorAgentIterations = useRunStore((s) => s.clearRefactorAgentIterations);

  const launchTestingIteration = useCallback(
    async (slot: 1 | 2 | 3 = 1) => {
      if (!projectPath?.trim()) return;
      const template = await readProjectFileOrEmpty(projectId, TESTING_AGENT_PROMPT_PATH, projectPath);
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

  const launchCleanupIteration = useCallback(
    async (slot: 1 | 2 | 3 = 1) => {
      if (!projectPath?.trim()) return;
      const template = await readProjectFileOrEmpty(projectId, CLEANUP_AGENT_PROMPT_PATH, projectPath);
      const iterationId = `cleanup-agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nextIndex = cleanupAgentIterations.length + 1;
      const prompt = buildCleanupAgentPrompt(project, template ?? "", nextIndex);
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
    [agentProvider, cleanupAgentIterations.length, project, projectId, projectPath, runTempTicket, startCleanupAgentLoop]
  );

  const launchRefactorIteration = useCallback(
    async (slot: 1 | 2 | 3 = 1) => {
      if (!projectPath?.trim()) return;
      const template = await readProjectFileOrEmpty(projectId, REFACTOR_AGENT_PROMPT_PATH, projectPath);
      const iterationId = `refactor-agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nextIndex = refactorAgentIterations.length + 1;
      const prompt = buildRefactorAgentPrompt(project, template ?? "", nextIndex);
      const iteration: WorkerAgentIteration = {
        id: iterationId,
        startedAt: Date.now(),
        prompt,
      };
      startRefactorAgentLoop(iteration);
      await runTempTicket(projectPath, prompt, `Refactor agent (Terminal ${slot})`, {
        isRefactorAgent: true,
        refactorAgentIterationId: iterationId,
        provider: agentProvider,
      });
    },
    [agentProvider, project, projectId, projectPath, refactorAgentIterations.length, runTempTicket, startRefactorAgentLoop]
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

  const handleStartCleanup = useCallback(async () => {
    if (!projectPath?.trim()) return;
    setStartingCleanup(true);
    try {
      setCleanupAgentActive(true);
      setCleanupAgentReplenishCallback(async (slot) => {
        await launchCleanupIteration(slot);
      });
      await launchCleanupIteration(1);
      toast.success("Cleanup Agent started. It will continue until stopped.");
    } catch (e) {
      setCleanupAgentActive(false);
      setCleanupAgentReplenishCallback(null);
      toast.error(e instanceof Error ? e.message : "Failed to start Cleanup Agent.");
    } finally {
      setStartingCleanup(false);
    }
  }, [launchCleanupIteration, projectPath, setCleanupAgentActive, setCleanupAgentReplenishCallback]);

  const handleStopCleanup = useCallback(() => {
    stopCleanupAgentLoop();
    toast.success("Cleanup Agent stopped. Current run can finish, no new iteration will start.");
  }, [stopCleanupAgentLoop]);

  const handleStartRefactor = useCallback(async () => {
    if (!projectPath?.trim()) return;
    setStartingRefactor(true);
    try {
      setRefactorAgentActive(true);
      setRefactorAgentReplenishCallback(async (slot) => {
        await launchRefactorIteration(slot);
      });
      await launchRefactorIteration(1);
      toast.success("Refactor Agent started. It will continue until stopped.");
    } catch (e) {
      setRefactorAgentActive(false);
      setRefactorAgentReplenishCallback(null);
      toast.error(e instanceof Error ? e.message : "Failed to start Refactor Agent.");
    } finally {
      setStartingRefactor(false);
    }
  }, [launchRefactorIteration, projectPath, setRefactorAgentActive, setRefactorAgentReplenishCallback]);

  const handleStopRefactor = useCallback(() => {
    stopRefactorAgentLoop();
    toast.success("Refactor Agent stopped. Current run can finish, no new iteration will start.");
  }, [stopRefactorAgentLoop]);

  const testingStatus = resolveStatus(testingAgentActive, testingAgentStatus);
  const cleanupStatus = resolveStatus(cleanupAgentActive, cleanupAgentStatus);
  const refactorStatus = resolveStatus(refactorAgentActive, refactorAgentStatus);
  const canStartTesting = !testingAgentActive && !startingTesting && !!projectPath?.trim();
  const canStartCleanup = !cleanupAgentActive && !startingCleanup && !!projectPath?.trim();
  const canStartRefactor = !refactorAgentActive && !startingRefactor && !!projectPath?.trim();

  const cards = useMemo(
    () => ({
      cleanup: { key: "cleanup", status: cleanupStatus, subtitle: "Housekeeping and maintenance workflows in a loop." },
      testing: { key: "testing", status: testingStatus, subtitle: "Continuous testing loop with iteration output." },
      refactor: { key: "refactor", status: refactorStatus, subtitle: "Refactor workflow loop with structural output tracking." },
    }),
    [cleanupStatus, refactorStatus, testingStatus]
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
  const refactorIterationsNewestFirst = useMemo(
    () => [...refactorAgentIterations].sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0)),
    [refactorAgentIterations]
  );

  return (
    <div className="rounded-2xl border border-cyan-500/20 overflow-hidden bg-gradient-to-br from-cyan-500/[0.12] via-indigo-500/[0.08] to-violet-500/[0.1]">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-7 shrink-0 rounded-lg bg-cyan-500/15">
              <Bot className="size-3.5 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-foreground tracking-tight">Agents</h3>
              <p className="text-[10px] text-muted-foreground normal-case">
                {providerLabel}, Testing, and workflow agents in a streamlined layout.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="px-5 pb-5">
        <Tabs defaultValue="testing" className="w-full">
          <TabsList className="flex w-full h-9 rounded-lg bg-cyan-500/[0.1] p-1 gap-0.5">
            {WORKER_AGENT_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex-1 min-w-0 text-xs rounded-md truncate">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="testing" className="mt-4 px-0 pt-0">
            <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/[0.08] p-3 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold">
                    <TestTube2 className="size-3.5 text-cyan-300" />
                    Testing Agent
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
                  className="h-8 text-xs gap-1.5 bg-cyan-500 text-cyan-50 hover:bg-cyan-400"
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

              <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/[0.08] p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium mb-2">
                  <TestTube2 className="size-3.5 text-cyan-300" />
                  Testing loop output
                </div>
                {testingIterationsNewestFirst.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No iterations yet. Start the Testing Agent to begin the loop.</p>
                ) : (
                  <ScrollArea className="h-[320px] pr-2">
                    <div className="space-y-3">
                      {testingIterationsNewestFirst.map((item, idx) => (
                        <div key={item.id} className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.06] p-3 space-y-2">
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

          <TabsContent value="cleanup" className="mt-4 px-0 pt-0">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] p-3 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold">
                    <Wrench className="size-3.5 text-emerald-300" />
                    Cleanup Agent
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
                  className="h-8 text-xs gap-1.5 bg-emerald-500 text-emerald-50 hover:bg-emerald-400"
                  disabled={!canStartCleanup}
                  onClick={() => void handleStartCleanup()}
                >
                  {startingCleanup ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                  Start Agent
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  disabled={!cleanupAgentActive}
                  onClick={handleStopCleanup}
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
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium mb-2">
                  <Wrench className="size-3.5 text-emerald-300" />
                  Cleanup loop output
                </div>
                {cleanupIterationsNewestFirst.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No iterations yet. Start the Cleanup Agent to begin the loop.</p>
                ) : (
                  <ScrollArea className="h-[320px] pr-2">
                    <div className="space-y-3">
                      {cleanupIterationsNewestFirst.map((item, idx) => (
                        <div key={item.id} className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3 space-y-2">
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
                              {item.createdArtifacts ?? "Waiting for cleanup artifact extraction..."}
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

          <TabsContent value="refactor" className="mt-4 px-0 pt-0">
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.08] p-3 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold">
                    <Sparkles className="size-3.5 text-violet-300" />
                    Refactor Agent
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{cards.refactor.subtitle}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${getWorkerAgentStatusMeta(cards.refactor.status).toneClassName}`}>
                  {cards.refactor.status === "running" ? <Loader2 className="size-3.5 animate-spin" /> : <PauseCircle className="size-3.5" />}
                  {getWorkerAgentStatusMeta(cards.refactor.status).label}
                </span>
              </div>
              <div className={WORKER_AGENT_ACTIONS_ROW_CLASSNAME}>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-violet-500 text-violet-50 hover:bg-violet-400"
                  disabled={!canStartRefactor}
                  onClick={() => void handleStartRefactor()}
                >
                  {startingRefactor ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                  Start Agent
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  disabled={!refactorAgentActive}
                  onClick={handleStopRefactor}
                >
                  <PauseCircle className="size-3.5" />
                  Stop
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs"
                  disabled={refactorIterationsNewestFirst.length === 0}
                  onClick={clearRefactorAgentIterations}
                >
                  Clear output
                </Button>
              </div>
              <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.08] p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium mb-2">
                  <Sparkles className="size-3.5 text-violet-300" />
                  Refactor loop output
                </div>
                {refactorIterationsNewestFirst.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No iterations yet. Start the Refactor Agent to begin the loop.</p>
                ) : (
                  <ScrollArea className="h-[320px] pr-2">
                    <div className="space-y-3">
                      {refactorIterationsNewestFirst.map((item, idx) => (
                        <div key={item.id} className="rounded-lg border border-violet-500/20 bg-violet-500/[0.06] p-3 space-y-2">
                          <div className="text-xs font-semibold text-foreground">
                            Iteration {refactorIterationsNewestFirst.length - idx}
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
                              {item.createdArtifacts ?? "Waiting for refactor artifact extraction..."}
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

          <TabsContent value="night-shift" className="mt-4 px-0 pt-0">
            {nightShiftContent ?? (
              <div className={WORKER_AGENT_NIGHT_SHIFT_CARD_CLASSNAME}>
                <div className="inline-flex items-center gap-2 text-xs font-semibold mb-2">
                  <Moon className="size-3.5 text-cyan-300" />
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
