/**
 * Unit tests for strip-terminal-artifacts: cleaning agent/terminal log lines from doc output.
 */
import { describe, it, expect } from "vitest";
import { stripTerminalArtifacts, MIN_DOCUMENT_LENGTH } from "../strip-terminal-artifacts";

describe("stripTerminalArtifacts", () => {
  it("returns empty string for empty input", () => {
    expect(stripTerminalArtifacts("")).toBe("");
  });

  it("preserves document content starting with heading", () => {
    const raw = "# Project Context\n\nSome body text.";
    expect(stripTerminalArtifacts(raw)).toBe("# Project Context\n\nSome body text.");
  });

  it("strips box-drawing / dash-only lines", () => {
    const raw = "━━━━━━━━━━\n# Title\n───";
    expect(stripTerminalArtifacts(raw)).toBe("# Title");
  });

  it("strips Implement All terminal slot line", () => {
    const raw = "Implement All – Terminal slot 1\n# Design\nContent";
    expect(stripTerminalArtifacts(raw)).toBe("# Design\nContent");
  });

  it("strips Project: /path line", () => {
    const raw = "Project: /Users/me/project\n# Vision\nText";
    expect(stripTerminalArtifacts(raw)).toBe("# Vision\nText");
  });

  it("strips cd into project path line", () => {
    const raw = "cd into project path\n# Architecture\nContent";
    expect(stripTerminalArtifacts(raw)).toBe("# Architecture\nContent");
  });

  it("strips arrow path line (→ /path)", () => {
    const raw = "→ /Users/me/project\n# Design\nContent";
    expect(stripTerminalArtifacts(raw)).toBe("# Design\nContent");
  });

  it("strips cd /path line", () => {
    const raw = "cd /home/user/repo\n# Vision\nText";
    expect(stripTerminalArtifacts(raw)).toBe("# Vision\nText");
  });

  it("strips running: agent -p line", () => {
    const raw = "running: agent -p design.prompt.md\n# Design\nBody";
    expect(stripTerminalArtifacts(raw)).toBe("# Design\nBody");
  });

  it("strips Summary of what was done and following meta until done/agent exited", () => {
    const raw = [
      "Summary of what was done",
      "  some meta",
      "done. agent exited",
      "# Project Context",
      "Real content",
    ].join("\n");
    expect(stripTerminalArtifacts(raw)).toBe("# Project Context\nReal content");
  });

  it("strips Summary of what's in place until document start (heading)", () => {
    const raw = [
      "Summary of what's in place",
      "  meta line",
      "## Vision",
      "Real content",
    ].join("\n");
    expect(stripTerminalArtifacts(raw)).toBe("## Vision\nReal content");
  });

  it("deduplicates consecutive identical trimmed lines", () => {
    const raw = "## Section\n## Section\n## Section";
    expect(stripTerminalArtifacts(raw)).toBe("## Section");
  });

  it("trims leading and trailing blank lines", () => {
    const raw = "\n\n# Title\n\nBody\n\n";
    expect(stripTerminalArtifacts(raw)).toBe("# Title\n\nBody");
  });

  it("strips .cursor path line with em dash (backtick format)", () => {
    const raw = "**`.cursor/1. project/design.md`** — updated\n# Design\nContent";
    expect(stripTerminalArtifacts(raw)).toBe("# Design\nContent");
  });

  it("strips .cursor path line in plain format (.cursor/path — ...)", () => {
    const raw = ".cursor/1. project/design.md — updated\n# Design\nContent";
    expect(stripTerminalArtifacts(raw)).toBe("# Design\nContent");
  });

  it("returns empty string when input contains only artifact lines (no document content)", () => {
    const raw = [
      "Implement All – Terminal slot 1",
      "Project: /Users/me/project",
      "cd into project path",
      "running: agent -p design.prompt.md",
    ].join("\n");
    expect(stripTerminalArtifacts(raw)).toBe("");
  });
});

describe("MIN_DOCUMENT_LENGTH", () => {
  it("is a number (used by callers for minimum doc length)", () => {
    expect(typeof MIN_DOCUMENT_LENGTH).toBe("number");
    expect(MIN_DOCUMENT_LENGTH).toBe(200);
  });
});
