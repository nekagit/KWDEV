/**
 * Unit tests for download-run-as-md: buildSingleRunMarkdown.
 * Download/copy functions are not tested here (require DOM/copy mocks).
 */
import { describe, it, expect } from "vitest";
import type { TerminalOutputHistoryEntry } from "@/types/run";
import { buildSingleRunMarkdown } from "../download-run-as-md";

function entry(
  overrides: Partial<TerminalOutputHistoryEntry> = {}
): TerminalOutputHistoryEntry {
  return {
    id: "run-1",
    runId: "run-1",
    label: "My run",
    output: "Hello world",
    timestamp: "2025-02-18T12:00:00.000Z",
    ...overrides,
  };
}

const exportedAt = "2025-02-18T14:30:00.000Z";

describe("buildSingleRunMarkdown", () => {
  it("starts with ## Run: label and includes ID and timestamp", () => {
    const e = entry({ label: "Test run", id: "id-42", timestamp: "2025-02-18T10:00:00.000Z" });
    const md = buildSingleRunMarkdown(e, exportedAt);
    expect(md).toContain("## Run: Test run");
    expect(md).toContain("**ID:** `id-42`");
    expect(md).toContain("**Timestamp:** 2025-02-18T10:00:00.000Z");
  });

  it("includes fenced output block", () => {
    const e = entry({ output: "line1\nline2" });
    const md = buildSingleRunMarkdown(e, exportedAt);
    expect(md).toContain("```");
    expect(md).toContain("line1");
    expect(md).toContain("line2");
  });

  it("ends with Exported at line when exportedAt provided", () => {
    const md = buildSingleRunMarkdown(entry(), exportedAt);
    expect(md).toContain("Exported at " + exportedAt + ".");
  });

  it("includes optional exit code when present", () => {
    const e = entry({ exitCode: 1 });
    const md = buildSingleRunMarkdown(e, exportedAt);
    expect(md).toContain("**Exit code:** 1");
  });

  it("includes optional duration when present", () => {
    const e = entry({ durationMs: 5000 });
    const md = buildSingleRunMarkdown(e, exportedAt);
    expect(md).toContain("**Duration:** 5000 ms");
  });

  it("includes optional slot when present", () => {
    const e = entry({ slot: 2 });
    const md = buildSingleRunMarkdown(e, exportedAt);
    expect(md).toContain("**Slot:** 2");
  });

  it("shows (no output) when output is empty or whitespace", () => {
    const e = entry({ output: "" });
    const md = buildSingleRunMarkdown(e, exportedAt);
    expect(md).toContain("(no output)");
  });

  it("shows (no output) when output is only whitespace", () => {
    const e = entry({ output: "   \n\t  " });
    const md = buildSingleRunMarkdown(e, exportedAt);
    expect(md).toContain("(no output)");
  });

  it("produces deterministic output for same input and exportedAt", () => {
    const e = entry({ label: "Same", output: "out" });
    const a = buildSingleRunMarkdown(e, exportedAt);
    const b = buildSingleRunMarkdown(e, exportedAt);
    expect(a).toBe(b);
  });

  it("minimal entry has heading, ID, timestamp, fenced block, and exported line", () => {
    const e = entry();
    const md = buildSingleRunMarkdown(e, exportedAt);
    expect(md).toMatch(/^## Run: My run/);
    expect(md).toContain("- **ID:**");
    expect(md).toContain("- **Timestamp:**");
    expect(md).toContain("```");
    expect(md).toContain("Hello world");
    expect(md).toContain("Exported at " + exportedAt + ".");
  });
});
