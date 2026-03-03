"use client";

/** Run Status Announcer component. */
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRunStore } from "@/store/run-store";
import { formatElapsed } from "@/lib/run-helpers";
import type { TerminalOutputHistoryEntry } from "@/types/run";

function messageForEntry(entry: TerminalOutputHistoryEntry): string {
  const failed =
    entry.exitCode !== undefined && entry.exitCode !== 0;
  const label = entry.label.trim() || "Run";
  const base = failed
    ? `Run ${label} failed`
    : `Run ${label} completed successfully`;
  const durationMs = entry.durationMs;
  if (durationMs != null && durationMs >= 0) {
    const durationPart =
      durationMs < 1000 ? "<1s" : formatElapsed(durationMs / 1000);
    return `${base} in ${durationPart}.`;
  }
  return `${base}.`;
}

/**
 * Visually hidden aria-live region that announces run start and completion to screen readers (ADR 0226).
 * When a run is added to runningRuns we announce "Run {label} started.";
 * when a run finishes (terminalOutputHistory grows) we announce success/failure.
 */
export function RunStatusAnnouncer() {
  const history = useRunStore((s) => s.terminalOutputHistory);
  const runningRuns = useRunStore((s) => s.runningRuns);
  const [message, setMessage] = useState<string | null>(null);
  const prevLengthRef = useRef(-1);
  const hasInitializedHistoryRef = useRef(false);
  const prevRunningIdsRef = useRef<Set<string>>(new Set());

  // When a new run appears in runningRuns, announce "Run {label} started." (ADR 0226). Skip on initial mount so we don't announce already-running runs.
  const hasInitializedRunningRef = useRef(false);
  useEffect(() => {
    const currentIds = new Set(runningRuns.map((r) => r.runId));
    const prev = prevRunningIdsRef.current;
    if (!hasInitializedRunningRef.current) {
      hasInitializedRunningRef.current = true;
      prevRunningIdsRef.current = currentIds;
      return;
    }
    const added = runningRuns.find((r) => !prev.has(r.runId));
    if (added) {
      const label = added.label?.trim() || "Run";
      setMessage(`Run ${label} started.`);
    }
    prevRunningIdsRef.current = currentIds;
  }, [runningRuns]);

  // When history grows, the newest entry is at index 0; announce completion once and show toast (ADR 0229). Skip initial sync so we don't toast on load.
  useEffect(() => {
    if (history.length === 0) {
      prevLengthRef.current = 0;
      hasInitializedHistoryRef.current = true;
      return;
    }
    if (!hasInitializedHistoryRef.current) {
      hasInitializedHistoryRef.current = true;
      prevLengthRef.current = history.length;
      return;
    }
    if (history.length > prevLengthRef.current) {
      prevLengthRef.current = history.length;
      const entry = history[0];
      const msg = messageForEntry(entry);
      setMessage(msg);
      const failed = entry.exitCode !== undefined && entry.exitCode !== 0;
      if (failed) {
        toast.error(msg);
      } else {
        toast.success(msg);
      }
    }
  }, [history]);

  // Clear message after a delay so the live region doesn't repeat and is ready for the next run.
  useEffect(() => {
    if (message === null) return;
    const id = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(id);
  }, [message]);

  return (
    <div
      aria-live="polite"
      aria-atomic
      role="status"
      className="sr-only"
      aria-relevant="additions text"
    >
      {message ?? ""}
    </div>
  );
}
