/**
 * Unit tests for run-history-date-groups: date grouping for Run tab History (Today, Yesterday, Last 7 days, Older).
 * Uses vi.useFakeTimers to fix "now" for deterministic grouping and title tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getRunHistoryDateGroupKey,
  groupRunHistoryByDate,
  getRunHistoryDateGroupOrder,
  getRunHistoryDateGroupTitle,
  RUN_HISTORY_DATE_GROUP_LABELS,
} from "../run-history-date-groups";

/** Noon on 2026-02-18 (local time) as "now" for tests. */
const NOW_MS = new Date(2026, 1, 18, 12, 0, 0).getTime();

function ts(year: number, month: number, day: number, hour = 12, min = 0): number {
  return new Date(year, month, day, hour, min, 0).getTime();
}

function entry(id: string, timestamp: string, label = "Run"): { id: string; runId: string; label: string; output: string; timestamp: string } {
  return { id, runId: `run-${id}`, label, output: "", timestamp };
}

describe("run-history-date-groups", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW_MS });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getRunHistoryDateGroupKey", () => {
    it("returns 'today' for timestamps on the current day", () => {
      // Same day as "now" (2026-02-18)
      expect(getRunHistoryDateGroupKey(ts(2026, 1, 18, 0, 0))).toBe("today");
      expect(getRunHistoryDateGroupKey(ts(2026, 1, 18, 12, 0))).toBe("today");
      expect(getRunHistoryDateGroupKey(ts(2026, 1, 18, 23, 59))).toBe("today");
    });

    it("returns 'yesterday' for timestamps on the previous day", () => {
      expect(getRunHistoryDateGroupKey(ts(2026, 1, 17, 0, 0))).toBe("yesterday");
      expect(getRunHistoryDateGroupKey(ts(2026, 1, 17, 12, 0))).toBe("yesterday");
      expect(getRunHistoryDateGroupKey(ts(2026, 1, 17, 23, 59))).toBe("yesterday");
    });

    it("returns 'last7' for timestamps within the last 7 days but before yesterday", () => {
      // 2–6 days ago (more than yesterday, within 7 days)
      expect(getRunHistoryDateGroupKey(ts(2026, 1, 16, 12, 0))).toBe("last7");
      expect(getRunHistoryDateGroupKey(ts(2026, 1, 15, 12, 0))).toBe("last7");
      expect(getRunHistoryDateGroupKey(ts(2026, 1, 12, 12, 0))).toBe("last7");
      // Boundary: 7 days ago from noon (Feb 11 12:00) is still "last7"
      expect(getRunHistoryDateGroupKey(ts(2026, 1, 11, 12, 0))).toBe("last7");
    });

    it("returns 'older' for timestamps older than 7 days", () => {
      expect(getRunHistoryDateGroupKey(ts(2026, 1, 11, 11, 59))).toBe("older");
      expect(getRunHistoryDateGroupKey(ts(2026, 1, 10, 12, 0))).toBe("older");
      expect(getRunHistoryDateGroupKey(ts(2025, 11, 1, 12, 0))).toBe("older");
    });

    it("treats non-finite or invalid timestamp as 'older'", () => {
      expect(getRunHistoryDateGroupKey(Number.NaN)).toBe("older");
      expect(getRunHistoryDateGroupKey(Number.NEGATIVE_INFINITY)).toBe("older");
      expect(getRunHistoryDateGroupKey(0)).toBe("older");
    });
  });

  describe("groupRunHistoryByDate", () => {
    it("buckets entries into today, yesterday, last7, older", () => {
      const entries = [
        entry("1", new Date(ts(2026, 1, 18, 10, 0)).toISOString()),
        entry("2", new Date(ts(2026, 1, 17, 10, 0)).toISOString()),
        entry("3", new Date(ts(2026, 1, 15, 10, 0)).toISOString()),
        entry("4", new Date(ts(2026, 1, 10, 10, 0)).toISOString()),
      ];
      const result = groupRunHistoryByDate(entries);

      expect(result.today).toHaveLength(1);
      expect(result.today[0].id).toBe("1");
      expect(result.yesterday).toHaveLength(1);
      expect(result.yesterday[0].id).toBe("2");
      expect(result.last7).toHaveLength(1);
      expect(result.last7[0].id).toBe("3");
      expect(result.older).toHaveLength(1);
      expect(result.older[0].id).toBe("4");
    });

    it("preserves order of entries within each group", () => {
      const entries = [
        entry("a", new Date(ts(2026, 1, 18, 8, 0)).toISOString()),
        entry("b", new Date(ts(2026, 1, 18, 9, 0)).toISOString()),
        entry("c", new Date(ts(2026, 1, 18, 10, 0)).toISOString()),
      ];
      const result = groupRunHistoryByDate(entries);

      expect(result.today.map((e) => e.id)).toEqual(["a", "b", "c"]);
    });

    it("returns empty arrays when no entries", () => {
      const result = groupRunHistoryByDate([]);

      expect(result.today).toEqual([]);
      expect(result.yesterday).toEqual([]);
      expect(result.last7).toEqual([]);
      expect(result.older).toEqual([]);
    });

    it("puts entries with invalid timestamp into older", () => {
      const entries = [
        entry("bad", "not-a-date"),
      ];
      const result = groupRunHistoryByDate(entries);

      expect(result.older).toHaveLength(1);
      expect(result.today).toHaveLength(0);
      expect(result.yesterday).toHaveLength(0);
      expect(result.last7).toHaveLength(0);
    });
  });

  describe("getRunHistoryDateGroupOrder", () => {
    it("returns keys in display order: today, yesterday, last7, older", () => {
      const order = getRunHistoryDateGroupOrder();
      expect(order).toEqual(["today", "yesterday", "last7", "older"]);
    });
  });

  describe("RUN_HISTORY_DATE_GROUP_LABELS", () => {
    it("defines labels for all group keys", () => {
      expect(RUN_HISTORY_DATE_GROUP_LABELS.today).toBe("Today");
      expect(RUN_HISTORY_DATE_GROUP_LABELS.yesterday).toBe("Yesterday");
      expect(RUN_HISTORY_DATE_GROUP_LABELS.last7).toBe("Last 7 days");
      expect(RUN_HISTORY_DATE_GROUP_LABELS.older).toBe("Older");
    });
  });

  describe("getRunHistoryDateGroupTitle", () => {
    it("returns a string containing the group label for each key", () => {
      expect(getRunHistoryDateGroupTitle("today")).toContain("Today");
      expect(getRunHistoryDateGroupTitle("yesterday")).toContain("Yesterday");
      expect(getRunHistoryDateGroupTitle("last7")).toContain("Last 7 days");
      expect(getRunHistoryDateGroupTitle("older")).toContain("Older");
    });

    it("returns a string that includes date information (e.g. parentheses)", () => {
      const titleToday = getRunHistoryDateGroupTitle("today");
      const titleOlder = getRunHistoryDateGroupTitle("older");
      expect(titleToday).toMatch(/\(.*\)/);
      expect(titleOlder).toMatch(/\(.*\)/);
    });
  });
});
