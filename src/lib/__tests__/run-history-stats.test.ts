/**
 * Unit tests for src/lib/run-history-stats.ts.
 */

import { describe, it, expect } from "vitest";
import {
  computeRunHistoryStats,
  formatRunHistoryStatsSummary,
  formatRunHistoryStatsToolbar,
  type RunHistoryStats,
} from "../run-history-stats";
import type { TerminalOutputHistoryEntry } from "@/types/run";

function entry(overrides: Partial<TerminalOutputHistoryEntry> = {}): TerminalOutputHistoryEntry {
  return {
    id: "id-1",
    runId: "run-1",
    label: "Test",
    output: "",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("computeRunHistoryStats", () => {
  it("returns zeros for empty array", () => {
    const stats = computeRunHistoryStats([]);
    expect(stats).toEqual({
      totalRuns: 0,
      successCount: 0,
      failCount: 0,
      totalDurationMs: 0,
    });
  });

  it("counts success (exitCode 0) and fail (non-zero or undefined)", () => {
    const stats = computeRunHistoryStats([
      entry({ id: "a", exitCode: 0 }),
      entry({ id: "b", exitCode: 1 }),
      entry({ id: "c" }),
    ]);
    expect(stats.totalRuns).toBe(3);
    expect(stats.successCount).toBe(1);
    expect(stats.failCount).toBe(2);
  });

  it("sums durationMs when present and non-negative", () => {
    const stats = computeRunHistoryStats([
      entry({ durationMs: 5000 }),
      entry({ durationMs: 10000 }),
      entry({ durationMs: undefined }),
      entry({ durationMs: -1 }),
    ]);
    expect(stats.totalDurationMs).toBe(15000);
  });
});

describe("formatRunHistoryStatsSummary", () => {
  it("returns 'No runs' for zero total", () => {
    const s: RunHistoryStats = { totalRuns: 0, successCount: 0, failCount: 0, totalDurationMs: 0 };
    expect(formatRunHistoryStatsSummary(s)).toBe("No runs");
  });

  it("formats mixed passed/failed and duration", () => {
    const s: RunHistoryStats = { totalRuns: 42, successCount: 38, failCount: 4, totalDurationMs: 0 };
    expect(formatRunHistoryStatsSummary(s)).toBe("42 runs, 38 passed, 4 failed, 0 total");
  });

  it("includes duration in seconds when < 1 min", () => {
    const s: RunHistoryStats = { totalRuns: 1, successCount: 1, failCount: 0, totalDurationMs: 45000 };
    expect(formatRunHistoryStatsSummary(s)).toContain("45s total");
  });

  it("includes duration as Xh Ym when >= 1 hour", () => {
    const s: RunHistoryStats = {
      totalRuns: 1,
      successCount: 1,
      failCount: 0,
      totalDurationMs: 2 * 3600 * 1000 + 15 * 60 * 1000,
    };
    expect(formatRunHistoryStatsSummary(s)).toContain("2h 15m total");
  });
});

describe("formatRunHistoryStatsToolbar", () => {
  it("returns empty string for zero total", () => {
    const s: RunHistoryStats = { totalRuns: 0, successCount: 0, failCount: 0, totalDurationMs: 0 };
    expect(formatRunHistoryStatsToolbar(s)).toBe("");
  });

  it("returns compact status and duration", () => {
    const s: RunHistoryStats = { totalRuns: 42, successCount: 38, failCount: 4, totalDurationMs: 900000 };
    expect(formatRunHistoryStatsToolbar(s)).toBe("38 passed, 4 failed · 15:00 total");
  });
});
