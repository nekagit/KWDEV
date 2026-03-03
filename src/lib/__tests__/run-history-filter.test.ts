/**
 * Unit tests for src/lib/run-history-filter.ts.
 */

import { describe, it, expect } from "vitest";
import { filterRunHistoryByQuery } from "../run-history-filter";
import type { TerminalOutputHistoryEntry } from "@/types/run";

function entry(overrides: Partial<TerminalOutputHistoryEntry> = {}): TerminalOutputHistoryEntry {
  return {
    id: "id-1",
    runId: "run-1",
    label: "Test run",
    output: "Some output",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("filterRunHistoryByQuery", () => {
  it("returns all entries when query is empty", () => {
    const entries = [entry({ id: "a" }), entry({ id: "b" })];
    expect(filterRunHistoryByQuery(entries, "")).toEqual(entries);
    expect(filterRunHistoryByQuery(entries, "   ")).toEqual(entries);
  });

  it("matches by label (case-insensitive)", () => {
    const entries = [
      entry({ id: "a", label: "Build frontend" }),
      entry({ id: "b", label: "Run tests" }),
    ];
    expect(filterRunHistoryByQuery(entries, "frontend")).toEqual([entries[0]]);
    expect(filterRunHistoryByQuery(entries, "FRONTEND")).toEqual([entries[0]]);
    expect(filterRunHistoryByQuery(entries, "run")).toEqual([entries[1]]);
  });

  it("matches by output (case-insensitive)", () => {
    const entries = [
      entry({ id: "a", output: "Compilation failed with error" }),
      entry({ id: "b", output: "All tests passed" }),
    ];
    expect(filterRunHistoryByQuery(entries, "error")).toEqual([entries[0]]);
    expect(filterRunHistoryByQuery(entries, "ERROR")).toEqual([entries[0]]);
    expect(filterRunHistoryByQuery(entries, "passed")).toEqual([entries[1]]);
  });

  it("includes run when query matches either label or output", () => {
    const entries = [
      entry({ id: "a", label: "Deploy", output: "Deployment failed" }),
      entry({ id: "b", label: "Deploy prod", output: "OK" }),
    ];
    expect(filterRunHistoryByQuery(entries, "Deploy")).toEqual(entries);
    expect(filterRunHistoryByQuery(entries, "failed")).toEqual([entries[0]]);
    expect(filterRunHistoryByQuery(entries, "prod")).toEqual([entries[1]]);
  });

  it("returns empty array when no run matches", () => {
    const entries = [entry({ id: "a", label: "Build", output: "done" })];
    expect(filterRunHistoryByQuery(entries, "xyz")).toEqual([]);
  });

  it("trims query before matching", () => {
    const entries = [entry({ id: "a", label: "Build" })];
    expect(filterRunHistoryByQuery(entries, "  Build  ")).toEqual(entries);
  });
});
