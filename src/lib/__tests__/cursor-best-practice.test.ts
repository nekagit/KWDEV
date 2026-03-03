/**
 * Unit tests for cursor-best-practice: best-practice .cursor folder structure.
 */
import { describe, it, expect } from "vitest";
import {
  CURSOR_BEST_PRACTICE_FILES,
  type CursorBestPracticeEntry,
} from "../cursor-best-practice";

describe("CURSOR_BEST_PRACTICE_FILES", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(CURSOR_BEST_PRACTICE_FILES)).toBe(true);
    expect(CURSOR_BEST_PRACTICE_FILES.length).toBeGreaterThan(0);
  });

  it("every entry has path (string) and optional description (string)", () => {
    for (const entry of CURSOR_BEST_PRACTICE_FILES) {
      expect(entry).toHaveProperty("path");
      expect(typeof entry.path).toBe("string");
      expect(entry.path.length).toBeGreaterThan(0);
      if (entry.description !== undefined) {
        expect(typeof entry.description).toBe("string");
      }
    }
  });

  it("contains expected key paths for .cursor structure", () => {
    const paths = CURSOR_BEST_PRACTICE_FILES.map((e) => e.path);
    expect(paths).toContain("AGENTS.md");
    expect(paths).toContain(".cursor/AGENTS.md");
    expect(paths).toContain(".cursor/rules/");
    expect(paths).toContain(".cursor/rules/RULE.md");
    expect(paths).toContain(".cursor/adr/");
    expect(paths).toContain(".cursor/adr/README.md");
    expect(paths).toContain("FEATURES.md");
    expect(paths).toContain("README.md");
  });

  it("has no duplicate paths", () => {
    const paths = CURSOR_BEST_PRACTICE_FILES.map((e) => e.path);
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });

  it("folder paths end with slash", () => {
    const folderEntries = CURSOR_BEST_PRACTICE_FILES.filter(
      (e) => e.path.endsWith("/")
    );
    expect(folderEntries.length).toBeGreaterThan(0);
    for (const e of folderEntries) {
      expect(e.path).toMatch(/\/$/);
    }
  });
});

describe("CursorBestPracticeEntry type", () => {
  it("allows entry with path only", () => {
    const entry: CursorBestPracticeEntry = { path: ".cursor/rules/" };
    expect(entry.path).toBe(".cursor/rules/");
    expect(entry.description).toBeUndefined();
  });

  it("allows entry with path and description", () => {
    const entry: CursorBestPracticeEntry = {
      path: "README.md",
      description: "Project overview.",
    };
    expect(entry.path).toBe("README.md");
    expect(entry.description).toBe("Project overview.");
  });
});
