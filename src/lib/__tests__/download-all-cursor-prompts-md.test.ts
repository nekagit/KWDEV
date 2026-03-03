/**
 * Unit tests for download-all-cursor-prompts-md: buildCursorPromptsMarkdown.
 * Async download/copy functions are not tested here (require fetch/copy mocks).
 */
import { describe, it, expect } from "vitest";
import {
  buildCursorPromptsMarkdown,
  type CursorPromptFileWithContent,
} from "../download-all-cursor-prompts-md";

function file(
  overrides: Partial<CursorPromptFileWithContent> = {}
): CursorPromptFileWithContent {
  return {
    relativePath: "night-shift.prompt.md",
    path: "data/prompts/night-shift.prompt.md",
    name: "night-shift.prompt.md",
    content: "# Night shift\n\nRun without a ticket.",
    updatedAt: "2025-02-18T12:00:00.000Z",
    ...overrides,
  };
}

describe("buildCursorPromptsMarkdown", () => {
  const exportedAt = "2025-02-18T14:30:00.000Z";

  it("starts with title and exported timestamp", () => {
    const md = buildCursorPromptsMarkdown([], exportedAt);
    expect(md).toContain("# All .cursor Prompts (*.prompt.md)");
    expect(md).toContain("Exported: " + exportedAt);
    expect(md).toContain("---");
  });

  it("includes one file as ## heading, Updated, and content", () => {
    const f = file({ path: "data/prompts/implement.prompt.md", content: "Implement phase." });
    const md = buildCursorPromptsMarkdown([f], exportedAt);
    expect(md).toContain("## data/prompts/implement.prompt.md");
    expect(md).toContain("**Updated:** " + f.updatedAt);
    expect(md).toContain("Implement phase.");
    expect(md).toContain("---");
  });

  it("escapes # in path so heading is valid markdown", () => {
    const f = file({ path: "folder/#special.prompt.md" });
    const md = buildCursorPromptsMarkdown([f], exportedAt);
    expect(md).toContain("## folder/\\#special.prompt.md");
  });

  it("includes multiple files in order with separators", () => {
    const a = file({ path: "a.prompt.md", content: "A" });
    const b = file({ path: "b.prompt.md", content: "B" });
    const md = buildCursorPromptsMarkdown([a, b], exportedAt);
    expect(md).toContain("## a.prompt.md");
    expect(md).toContain("## b.prompt.md");
    expect(md).toContain("A");
    expect(md).toContain("B");
    const sections = md.split("---").filter((s) => s.trim().length > 0);
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });

  it("trims file content", () => {
    const f = file({ content: "  inner\n\n  " });
    const md = buildCursorPromptsMarkdown([f], exportedAt);
    expect(md).toContain("inner");
  });

  it("produces deterministic output for same input", () => {
    const files = [file({ path: "x.prompt.md" }), file({ path: "y.prompt.md" })];
    const a = buildCursorPromptsMarkdown(files, exportedAt);
    const b = buildCursorPromptsMarkdown(files, exportedAt);
    expect(a).toBe(b);
  });

  it("empty files array still has header and timestamp", () => {
    const md = buildCursorPromptsMarkdown([], exportedAt);
    expect(md).toMatch(/^# All \.cursor Prompts/);
    expect(md).toContain("Exported:");
    expect(md.trimEnd().endsWith("---")).toBe(true);
  });
});
