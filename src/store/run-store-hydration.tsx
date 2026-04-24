"use client";

/**
 * Hydrates the run store: Tauri detection, initial data load, and event listeners.
 * Mount once in the root layout.
 */
import { useEffect, useRef } from "react";
import { listen, invoke, isTauri } from "@/lib/tauri";
import { writeProjectFile } from "@/lib/api-projects";
import { stripTerminalArtifacts, MIN_DOCUMENT_LENGTH } from "@/lib/strip-terminal-artifacts";
import { toast } from "sonner";
import { debugIngest } from "@/lib/debug-ingest";
import { logAppActivity } from "@/lib/app-activity-log";
import { useRunStore, takeRunCompleteHandler } from "./run-store";

/** Cleanup all queues and stop all agents. Called on app close. */
async function cleanupOnClose(): Promise<void> {
  const store = useRunStore.getState();
  store.clearPendingTempTicketQueue();
  store.setNightShiftActive(false);
  store.setNightShiftReplenishCallback(null);
  store.setNightShiftIdeaDrivenState({
    mode: false,
    idea: null,
    tickets: [],
    ticketIndex: 0,
    phase: null,
    completedInPhase: 0,
    ideasQueue: [],
  });
  store.setIdeaDrivenAutoState({
    phase: null,
    pendingMilestones: [],
    currentMilestoneIndex: 0,
    allTickets: [],
    currentTicketIndex: 0,
  });
  store.setIdeaDrivenTicketPhases({});
  store.clearIdeaDrivenProgress();
  store.setTestingAgentActive(false);
  store.setTestingAgentReplenishCallback(null);
  store.setCleanupAgentActive(false);
  store.setCleanupAgentReplenishCallback(null);
  store.setRefactorAgentActive(false);
  store.setRefactorAgentReplenishCallback(null);
  if (isTauri) {
    try {
      await invoke("stop_script");
    } catch {
      // Ignore errors during cleanup
    }
  }
}

/** Match first localhost/127.0.0.1 URL in a line (e.g. from Next.js, Vite dev server output). */
const LOCALHOST_URL_RE = /https?:\/\/(?:localhost|127\.0\.0\.1)(?::(\d+))?(?:\/[^\s]*)?/i;

/**
 * Runs side effects that hydrate the run store: Tauri env detection,
 * initial data load, and Tauri event listeners. Mount once in layout.
 */
export function RunStoreHydration() {
  const refreshData = useRunStore((s) => s.refreshData);
  const isTauriEnv = useRunStore((s) => s.isTauriEnv);
  const setIsTauriEnv = useRunStore((s) => s.setIsTauriEnv);
  const setLoading = useRunStore((s) => s.setLoading);
  const setRunInfos = useRunStore((s) => s.setRunInfos);
  const setLocalUrl = useRunStore((s) => s.setLocalUrl);
  const unlistenLogRef = useRef<(() => void) | null>(null);
  const unlistenExitedRef = useRef<(() => void) | null>(null);

  // Resolve Tauri vs browser quickly so refreshData runs without a long delay (was 2000ms, now 400ms).
  useEffect(() => {
    const check = () => {
      const v = isTauri;
      setIsTauriEnv(v);
      // #region agent log
      debugIngest({ sessionId: "8a3da1", location: "run-store-hydration.tsx", message: "isTauriEnv_check", data: { isTauri: v }, timestamp: Date.now(), hypothesisId: "H4" }, { "X-Debug-Session-Id": "8a3da1" });
      // #endregion
    };
    check();
    const t1 = setTimeout(check, 150);
    const t2 = setTimeout(() => {
      setIsTauriEnv((prev) => {
        const next = prev === null ? false : prev;
        // #region agent log
        debugIngest({ sessionId: "8a3da1", location: "run-store-hydration.tsx", message: "isTauriEnv_final", data: { resolved: next }, timestamp: Date.now(), hypothesisId: "H4" }, { "X-Debug-Session-Id": "8a3da1" });
        // #endregion
        return next;
      });
    }, 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [setIsTauriEnv]);

  // Cleanup all queues and agents when app closes (beforeunload for browser, Tauri close event for desktop)
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupOnClose();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (isTauriEnv === false) setLoading(false);
  }, [isTauriEnv, setLoading]);

  useEffect(() => {
    if (isTauriEnv !== null) {
      // #region agent log
      debugIngest({ sessionId: "8a3da1", location: "run-store-hydration.tsx", message: "refreshData_called", data: { isTauriEnv }, timestamp: Date.now(), hypothesisId: "H2" }, { "X-Debug-Session-Id": "8a3da1" });
      // #endregion
      refreshData();
      logAppActivity("hydration", `Run store hydration refreshed (tauri=${String(isTauriEnv)})`);
    }
  }, [isTauriEnv, refreshData]);

  useEffect(() => {
    if (isTauriEnv !== true) return;
    let cancelled = false;
    listen<{ run_id: string; line: string }>("script-log", (event) => {
      const { run_id, line } = event.payload;
      setRunInfos((prev) =>
        prev.map((r) =>
          r.runId === run_id ? { ...r, logLines: [...r.logLines, line] } : r
        )
      );
      const match = line.match(LOCALHOST_URL_RE);
      if (match) {
        const url = match[0];
        const store = useRunStore.getState();
        const run = store.runningRuns.find((r) => r.runId === run_id);
        if (run && !run.localUrl) setLocalUrl(run_id, url);
      }
    }).then((fn) => {
      if (!cancelled) unlistenLogRef.current = fn;
    });
    return () => {
      cancelled = true;
      unlistenLogRef.current?.();
      unlistenLogRef.current = null;
    };
  }, [isTauriEnv, setRunInfos, setLocalUrl]);

  useEffect(() => {
    if (isTauriEnv !== true) return;
    let cancelled = false;
    listen<{ run_id: string; exit_code?: number }>("script-exited", (event) => {
      const { run_id, exit_code } = event.payload;
      const store = useRunStore.getState();
      const run = store.runningRuns.find((r) => r.runId === run_id);
      // When backend reports exit 1 but output says "Agent exited with code 0", treat as success (store 0)
      const output = run?.logLines?.join("\n") ?? "";
      const outputSaysAgentExitedZero = /Agent exited with code 0\b/.test(output);
      const effectiveExitCode =
        exit_code === 1 && outputSaysAgentExitedZero ? 0 : exit_code;
      const now = Date.now();
      store.setRunInfos((prev) =>
        prev.map((r) =>
          r.runId === run_id
            ? { ...r, status: "done" as const, doneAt: now, ...(effectiveExitCode !== undefined && { exitCode: effectiveExitCode }) }
            : r
        )
      );
      store.runNextInQueue(run_id);

      // Night shift: replenish when a night-shift run exits (or run not found but night shift active — e.g. event before runId was set)
      const state = useRunStore.getState();
      if (state.nightShiftActive && state.nightShiftReplenishCallback) {
        const isNightShiftExit = run?.meta?.isNightShift === true;
        const runNotFoundAssumeNightShift = run === undefined;
        if (isNightShiftExit || runNotFoundAssumeNightShift) {
          const slot = (run?.slot ?? 1) as 1 | 2 | 3;
          const exitingRun = run ?? null;
          (async () => {
            try {
              await state.nightShiftReplenishCallback!(slot, exitingRun);
            } catch (err) {
              console.error("[night-shift] replenish failed:", err);
              toast.error("Night shift replenish failed. Check console.");
            }
          })();
        }
      }

      // Testing Agent: replenish endlessly while active (same pattern as Night Shift).
      if (state.testingAgentActive && state.testingAgentReplenishCallback) {
        const isTestingAgentExit = run?.meta?.isTestingAgent === true;
        if (isTestingAgentExit && run) {
          const slot = (run.slot ?? 1) as 1 | 2 | 3;
          const exitingRun = run;
          (async () => {
            try {
              await state.testingAgentReplenishCallback!(slot, exitingRun);
            } catch (err) {
              console.error("[testing-agent] replenish failed:", err);
              toast.error("Testing Agent replenish failed. Check console.");
            }
          })();
        }
      }
      if (state.cleanupAgentActive && state.cleanupAgentReplenishCallback) {
        const isCleanupAgentExit = run?.meta?.isCleanupAgent === true;
        if (isCleanupAgentExit && run) {
          const slot = (run.slot ?? 1) as 1 | 2 | 3;
          const exitingRun = run;
          (async () => {
            try {
              await state.cleanupAgentReplenishCallback!(slot, exitingRun);
            } catch (err) {
              console.error("[cleanup-agent] replenish failed:", err);
              toast.error("Cleanup Agent replenish failed. Check console.");
            }
          })();
        }
      }
      if (state.refactorAgentActive && state.refactorAgentReplenishCallback) {
        const isRefactorAgentExit = run?.meta?.isRefactorAgent === true;
        if (isRefactorAgentExit && run) {
          const slot = (run.slot ?? 1) as 1 | 2 | 3;
          const exitingRun = run;
          (async () => {
            try {
              await state.refactorAgentReplenishCallback!(slot, exitingRun);
            } catch (err) {
              console.error("[refactor-agent] replenish failed:", err);
              toast.error("Refactor Agent replenish failed. Check console.");
            }
          })();
        }
      }

      if (run?.label === "Static analysis checklist") {
        store.markStaticAnalysisReportReady(run_id);
      }

      // Append to terminal output history (all completed runs)
      if (run) {
        const output = run.logLines.join("\n");
        const durationMs =
          run.startedAt != null && run.doneAt != null && run.doneAt >= run.startedAt
            ? run.doneAt - run.startedAt
            : undefined;
        store.addTerminalOutputToHistory({
          runId: run.runId,
          label: run.label,
          output,
          timestamp: new Date().toISOString(),
          exitCode: effectiveExitCode,
          slot: run.slot,
          durationMs,
        });
        // Visible toast: use effective exit code (0 when output says agent exited 0)
        const label = run.label.trim() || "Run";
        const success = effectiveExitCode === undefined || effectiveExitCode === 0;
        if (success) {
          toast.success(`Run ${label} completed successfully.`);
          logAppActivity("runs", `Run completed: ${label} (${run_id})`);
        } else {
          toast.error(`Run ${label} failed.`);
          logAppActivity("runs", `Run failed: ${label} (${run_id})`);
        }
      }

      if (run?.meta) {
        if (run.meta.isTestingAgent && run.meta.testingAgentIterationId) {
          const rawOutput = run.logLines.join("\n");
          const createdTests = rawOutput
            .split("\n")
            .filter((line) => /\.test\.(ts|tsx|js|jsx)\b/i.test(line) || /\bPASS\b/i.test(line))
            .slice(0, 12)
            .join("\n")
            .trim();
          store.completeTestingAgentIteration(
            run.meta.testingAgentIterationId,
            rawOutput.trim() || "No output captured.",
            createdTests || "No explicit test artifacts detected in output."
          );
        }
        if (run.meta.isCleanupAgent && run.meta.cleanupAgentIterationId) {
          const rawOutput = run.logLines.join("\n");
          const createdArtifacts = rawOutput
            .split("\n")
            .filter((line) => /\b(remove|delete|cleanup|prune|lint|format)\b/i.test(line) || /\.(ts|tsx|js|jsx|json|md)\b/i.test(line))
            .slice(0, 12)
            .join("\n")
            .trim();
          store.completeCleanupAgentIteration(
            run.meta.cleanupAgentIterationId,
            rawOutput.trim() || "No output captured.",
            createdArtifacts || "No explicit cleanup artifacts detected in output."
          );
        }
        if (run.meta.isRefactorAgent && run.meta.refactorAgentIterationId) {
          const rawOutput = run.logLines.join("\n");
          const createdArtifacts = rawOutput
            .split("\n")
            .filter((line) => /\b(refactor|extract|rename|simplify|dedupe|improve)\b/i.test(line) || /\.(ts|tsx|js|jsx|json|md)\b/i.test(line))
            .slice(0, 12)
            .join("\n")
            .trim();
          store.completeRefactorAgentIteration(
            run.meta.refactorAgentIterationId,
            rawOutput.trim() || "No output captured.",
            createdArtifacts || "No explicit refactor artifacts detected in output."
          );
        }

        // Get the latest log lines from the updated store in case more arrived after initial capture
        const latestState = useRunStore.getState();
        const latestRun = latestState.runningRuns.find((r) => r.runId === run_id);
        const stdout = (latestRun?.logLines ?? run.logLines).join("\n");
        const projectId = run.meta.projectId;
        const ticketId = run.meta.ticketId;
        const success = effectiveExitCode === undefined || effectiveExitCode === 0;

        // Ticket Implement All finished: mark ticket done and record implementation log.
        if (
          success &&
          typeof run.meta.ticketNumber === "number" &&
          projectId &&
          ticketId &&
          run.meta.repoPath
        ) {
          (async () => {
            let filesChanged: { path: string; status: string }[] = [];
            if (isTauri) {
              try {
                const fromRef = run.meta!.gitRefAtStart ?? "";
                filesChanged = (await invoke<{ path: string; status: string }[]>("get_git_diff_name_status", {
                  projectPath: run.meta!.repoPath!,
                  fromRef: fromRef,
                })) ?? [];
              } catch {
                /* ignore */
              }
            }
            const summaryParts: string[] = [];
            if (filesChanged.length > 0) {
              const added = filesChanged.filter((f) => f.status === "A").length;
              const deleted = filesChanged.filter((f) => f.status === "D").length;
              const modified = filesChanged.filter((f) => f.status === "M").length;
              summaryParts.push(`${filesChanged.length} files changed${added ? `, ${added} added` : ""}${modified ? `, ${modified} modified` : ""}${deleted ? `, ${deleted} deleted` : ""}.`);
            }
            const logPreview = stdout.trim().slice(0, 400);
            if (logPreview) summaryParts.push(logPreview);
            const summary = summaryParts.join(" ");
            const completedAt = new Date().toISOString();
            try {
              if (isTauri) {
                await invoke("update_plan_ticket", {
                  projectId: run.meta!.projectId,
                  ticketId: ticketId,
                  done: true,
                  status: "Done",
                });
                await invoke("append_implementation_log_entry", {
                  projectId: run.meta!.projectId,
                  runId: run_id,
                  ticketNumber: run.meta!.ticketNumber,
                  ticketTitle: run.meta!.ticketTitle ?? "",
                  milestoneId: run.meta!.milestoneId ?? null,
                  ideaId: run.meta!.ideaId ?? null,
                  completedAt: completedAt,
                  filesChanged: JSON.stringify(filesChanged),
                  summary,
                });
              } else {
                const res = await fetch(`/api/data/projects/${run.meta!.projectId}/complete-run`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ticket_id: ticketId,
                    run_id,
                    ticket_number: run.meta!.ticketNumber,
                    ticket_title: run.meta!.ticketTitle ?? "",
                    milestone_id: run.meta!.milestoneId ?? null,
                    idea_id: run.meta!.ideaId ?? null,
                    completed_at: completedAt,
                    files_changed: filesChanged,
                    summary,
                  }),
                });
                if (!res.ok) throw new Error(await res.text());
              }
              // Move UI to Control tab only when not in auto idea-driven (user stays on Worker / Night shift tab).
              window.dispatchEvent(
                new CustomEvent("ticket-implementation-done", {
                  detail: {
                    projectId: run.meta!.projectId,
                    fromAutoIdeaDriven: run.meta?.isNightShiftIdeaDriven === true,
                  },
                })
              );
            } catch (err) {
              console.error("[run-exited] implementation-log POST failed:", err);
            }
          })();
        }
        // When Analyze runs via Worker (analyze-doc): strip terminal artifacts, write to outputPath, then dispatch run-complete.
        if (
          run.meta.onComplete === "analyze-doc" &&
          run.meta.projectId &&
          run.meta.outputPath &&
          typeof run.meta.payload?.repoPath === "string"
        ) {
          const stripped = stripTerminalArtifacts(stdout);
          const content =
            stripped.length >= MIN_DOCUMENT_LENGTH
              ? stripped
              : `# ${run.meta.outputPath.replace(/^.*\//, "").replace(/\.md$/i, "")}\n\n*Output was too short or only terminal output. Run Analyze again.*\n`;
          const runId = run_id;
          const meta = run.meta;
          (async () => {
            const projectId = meta!.projectId!;
            const outputPath = meta!.outputPath!;
            const repoPath = meta!.payload!.repoPath as string;
            try {
              await writeProjectFile(projectId, outputPath, content, repoPath);
              toast.success(`Analysis written to ${outputPath.replace(/^\.cursor\//, "")}`);
              const handlerKey =
                "analyze-doc:" + (meta.projectId ?? meta.payload?.projectId ?? meta.payload?.requestId ?? runId);
              const handler = takeRunCompleteHandler(handlerKey);
              if (handler) {
                try {
                  handler(stdout);
                } catch (e) {
                  console.error("[run-exited] runComplete handler error:", e);
                }
              }
              window.dispatchEvent(
                new CustomEvent("run-complete", {
                  detail: { runId, onComplete: "analyze-doc", stdout, meta },
                })
              );
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              console.error("[run-exited] writeProjectFile for analyze-doc failed:", err);
              toast.error(`Failed to write analysis: ${msg}`);
              const handlerKey =
                "analyze-doc:" + (meta.projectId ?? meta.payload?.projectId ?? meta.payload?.requestId ?? runId);
              const handler = takeRunCompleteHandler(handlerKey);
              if (handler) {
                try {
                  handler(stdout);
                } catch (e) {
                  console.error("[run-exited] runComplete handler error:", e);
                }
              }
              window.dispatchEvent(
                new CustomEvent("run-complete", {
                  detail: { runId, onComplete: "analyze-doc", stdout, meta },
                })
              );
            }
          })();
        } else if (run.meta.onComplete) {
          const key =
            run.meta.onComplete +
            ":" +
            (run.meta.payload?.projectId ?? run.meta.payload?.requestId ?? run_id);
          const handler = takeRunCompleteHandler(key);
          if (handler) {
            try {
              handler(stdout);
            } catch (err) {
              console.error("[run-exited] runComplete handler error:", err);
            }
          }
          window.dispatchEvent(
            new CustomEvent("run-complete", {
              detail: {
                runId: run_id,
                onComplete: run.meta.onComplete,
                stdout,
                meta: run.meta,
              },
            })
          );
        }
      }
    }).then((fn) => {
      if (!cancelled) unlistenExitedRef.current = fn;
    });
    return () => {
      cancelled = true;
      unlistenExitedRef.current?.();
      unlistenExitedRef.current = null;
    };
  }, [isTauriEnv]);

  return null;
}
