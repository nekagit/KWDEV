/**
 * Unit tests for run-helpers used by Implement All and terminal slot UI.
 */
import { describe, it, expect } from "vitest";
import type { RunInfo } from "@/types/run";
import { MAX_TERMINAL_SLOTS } from "@/types/run";
import {
  isImplementAllRun,
  parseTicketNumberFromRunLabel,
  formatElapsed,
  formatDurationMs,
  getNextFreeSlotOrNull,
} from "../run-helpers";

describe("isImplementAllRun", () => {
  it("returns true for Implement All label", () => {
    expect(isImplementAllRun({ label: "Implement All" })).toBe(true);
  });

  it("returns true for Implement All (Terminal N)", () => {
    expect(isImplementAllRun({ label: "Implement All (Terminal 1)" })).toBe(true);
    expect(isImplementAllRun({ label: "Implement All (Terminal 2)" })).toBe(true);
  });

  it("returns true for Ticket #N labels", () => {
    expect(isImplementAllRun({ label: "Ticket #1: implement further" })).toBe(true);
    expect(isImplementAllRun({ label: "Ticket #42: Some title" })).toBe(true);
  });

  it("returns true for Ticket # with no number (label still counts as ticket run for slot display)", () => {
    expect(isImplementAllRun({ label: "Ticket #: no number" })).toBe(true);
    expect(isImplementAllRun({ label: "Ticket #" })).toBe(true);
  });

  it("returns true for Analyze and Debug labels", () => {
    expect(isImplementAllRun({ label: "Analyze: my-project" })).toBe(true);
    expect(isImplementAllRun({ label: "Debug: fix bug" })).toBe(true);
  });

  it("returns true for Fast dev and Night shift labels", () => {
    expect(isImplementAllRun({ label: "Fast dev: my-prompt" })).toBe(true);
    expect(isImplementAllRun({ label: "Night shift" })).toBe(true);
    expect(isImplementAllRun({ label: "Night shift (Terminal 1)" })).toBe(true);
    expect(isImplementAllRun({ label: "Night shift (Terminal 3)" })).toBe(true);
  });

  it("returns false for other labels", () => {
    expect(isImplementAllRun({ label: "Setup Prompt: design" })).toBe(false);
    expect(isImplementAllRun({ label: "Manual run" })).toBe(false);
  });
});

describe("parseTicketNumberFromRunLabel", () => {
  it("parses ticket number from Ticket #N: title", () => {
    expect(parseTicketNumberFromRunLabel("Ticket #1: implement further")).toBe(1);
    expect(parseTicketNumberFromRunLabel("Ticket #42: Some title")).toBe(42);
  });

  it("returns null for non-ticket labels", () => {
    expect(parseTicketNumberFromRunLabel("Implement All")).toBe(null);
    expect(parseTicketNumberFromRunLabel(undefined)).toBe(null);
    expect(parseTicketNumberFromRunLabel("")).toBe(null);
  });

  it("parses ticket #0 and large numbers", () => {
    expect(parseTicketNumberFromRunLabel("Ticket #0: title")).toBe(0);
    expect(parseTicketNumberFromRunLabel("Ticket #999: x")).toBe(999);
  });

  it("parses ticket number when label has no colon after number", () => {
    expect(parseTicketNumberFromRunLabel("Ticket #123")).toBe(123);
  });

  it("returns null when Ticket # has no number", () => {
    expect(parseTicketNumberFromRunLabel("Ticket #: no number")).toBe(null);
    expect(parseTicketNumberFromRunLabel("Ticket #")).toBe(null);
  });

  it("returns null when there is a space between # and number", () => {
    expect(parseTicketNumberFromRunLabel("Ticket # 5: title")).toBe(null);
    expect(parseTicketNumberFromRunLabel("Ticket # 42")).toBe(null);
  });

  it("uses first Ticket #N when label contains another #number (e.g. issue ref)", () => {
    expect(parseTicketNumberFromRunLabel("Ticket #2: Fix issue #99")).toBe(2);
    expect(parseTicketNumberFromRunLabel("Ticket #1: See #123 in code")).toBe(1);
  });

  it("parses ticket number when label has trailing space after number", () => {
    expect(parseTicketNumberFromRunLabel("Ticket #7 ")).toBe(7);
    expect(parseTicketNumberFromRunLabel("Ticket #3: title ")).toBe(3);
  });

  it("returns null when label has leading space (label must start with Ticket #)", () => {
    expect(parseTicketNumberFromRunLabel(" Ticket #5: title")).toBe(null);
    expect(parseTicketNumberFromRunLabel("  Ticket #1")).toBe(null);
  });
});

describe("formatElapsed", () => {
  it("formats seconds under 60 as Xs", () => {
    expect(formatElapsed(0)).toBe("0s");
    expect(formatElapsed(1)).toBe("1s");
    expect(formatElapsed(45)).toBe("45s");
    expect(formatElapsed(59)).toBe("59s");
  });

  it("formats 60+ seconds as m:ss", () => {
    expect(formatElapsed(60)).toBe("1:00");
    expect(formatElapsed(90)).toBe("1:30");
    expect(formatElapsed(125)).toBe("2:05");
  });

  it("floors fractional seconds", () => {
    expect(formatElapsed(0.9)).toBe("0s");
    expect(formatElapsed(59.9)).toBe("59s");
    expect(formatElapsed(65.4)).toBe("1:05");
  });

  it("formats sub-second duration as 0s (callers may show <1s for display)", () => {
    expect(formatElapsed(0.1)).toBe("0s");
    expect(formatElapsed(0.001)).toBe("0s");
  });

  it("formats long runs as m:ss", () => {
    expect(formatElapsed(3599)).toBe("59:59");
  });

  it("formats one hour as 60:00", () => {
    expect(formatElapsed(3600)).toBe("60:00");
  });

  it("formats just over one hour as 60:01", () => {
    expect(formatElapsed(3601)).toBe("60:01");
  });

  it("formats two or more hours as m:ss", () => {
    expect(formatElapsed(7200)).toBe("120:00");
    expect(formatElapsed(7261)).toBe("121:01");
  });

  it("treats NaN as 0", () => {
    expect(formatElapsed(Number.NaN)).toBe("0s");
  });

  it("treats negative seconds as 0", () => {
    expect(formatElapsed(-1)).toBe("0s");
    expect(formatElapsed(-90)).toBe("0s");
  });

  it("treats non-finite values (Infinity, -Infinity) as 0", () => {
    expect(formatElapsed(Number.POSITIVE_INFINITY)).toBe("0s");
    expect(formatElapsed(Number.NEGATIVE_INFINITY)).toBe("0s");
  });
});

describe("formatDurationMs", () => {
  it("returns empty string for undefined or negative", () => {
    expect(formatDurationMs(undefined)).toBe("");
    expect(formatDurationMs(-1)).toBe("");
    expect(formatDurationMs(-1000)).toBe("");
  });

  it("formats milliseconds as Xs for under 60s (rounded)", () => {
    expect(formatDurationMs(0)).toBe("0s");
    expect(formatDurationMs(45000)).toBe("45s");
    expect(formatDurationMs(500)).toBe("1s");
    expect(formatDurationMs(499)).toBe("0s");
  });

  it("formats 60s+ as m:ss", () => {
    expect(formatDurationMs(60000)).toBe("1:00");
    expect(formatDurationMs(125000)).toBe("2:05");
  });
});

function runInfo(overrides: Partial<{ runId: string; label: string; status: "running" | "done"; slot: number }>): RunInfo {
  return {
    runId: "r1",
    label: "Implement All",
    logLines: [],
    status: "running",
    slot: 1,
    ...overrides,
  };
}

describe("getNextFreeSlotOrNull", () => {
  it("returns 1 when no runs", () => {
    expect(getNextFreeSlotOrNull([])).toBe(1);
  });

  it("returns 2 when slot 1 is occupied by an Implement All run", () => {
    expect(getNextFreeSlotOrNull([runInfo({ runId: "a", slot: 1, label: "Implement All" })])).toBe(2);
  });

  it("returns 1 when slot 1 is occupied by a non–Implement All run (Manual run)", () => {
    expect(getNextFreeSlotOrNull([runInfo({ runId: "a", slot: 1, label: "Manual run" })])).toBe(1);
  });

  it("returns 3 when slots 1 and 2 are occupied", () => {
    expect(
      getNextFreeSlotOrNull([
        runInfo({ runId: "a", slot: 1, label: "Implement All" }),
        runInfo({ runId: "b", slot: 2, label: "Ticket #1: x" }),
      ])
    ).toBe(3);
  });

  it("returns 4 when slots 1–3 are occupied", () => {
    expect(
      getNextFreeSlotOrNull([
        runInfo({ runId: "a", slot: 1, label: "Implement All" }),
        runInfo({ runId: "b", slot: 2, label: "Ticket #1: x" }),
        runInfo({ runId: "c", slot: 3, label: "Fast dev: y" }),
      ])
    ).toBe(4);
  });

  it("returns null when all MAX_TERMINAL_SLOTS are occupied", () => {
    const runs: RunInfo[] = Array.from({ length: MAX_TERMINAL_SLOTS }, (_, i) =>
      runInfo({ runId: `r-${i}`, slot: i + 1, label: "Implement All" })
    );
    expect(getNextFreeSlotOrNull(runs)).toBe(null);
  });

  it("ignores runs with status done", () => {
    expect(
      getNextFreeSlotOrNull([runInfo({ runId: "a", slot: 1, label: "Implement All", status: "done" })])
    ).toBe(1);
  });

  it("returns first free slot when slot 2 is free", () => {
    expect(
      getNextFreeSlotOrNull([
        runInfo({ runId: "a", slot: 1, label: "Implement All" }),
        runInfo({ runId: "b", slot: 3, label: "Ticket #2: y" }),
      ])
    ).toBe(2);
  });
});
