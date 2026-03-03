/**
 * Unit tests for download-helpers: filename sanitization and timestamp.
 * downloadBlob/triggerFileDownload are not tested here (require DOM).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  safeFilenameSegment,
  safeNameForFile,
  filenameTimestamp,
} from "../download-helpers";

describe("safeFilenameSegment", () => {
  it("returns sanitized string: unsafe chars to underscore, spaces to hyphen", () => {
    expect(safeFilenameSegment("hello world")).toBe("hello-world");
    expect(safeFilenameSegment("a/b\\c*d")).toBe("a_b_c_d");
    expect(safeFilenameSegment("file:name")).toBe("file_name");
  });

  it("trims leading and trailing whitespace", () => {
    expect(safeFilenameSegment("  title  ")).toBe("title");
    expect(safeFilenameSegment("  a-b  ")).toBe("a-b");
  });

  it("uses default maxLength 60 when only two args (text, fallback)", () => {
    const long = "a".repeat(100);
    expect(safeFilenameSegment(long, "fallback").length).toBe(60);
    expect(safeFilenameSegment(long, "fallback")).toBe("a".repeat(60));
  });

  it("returns fallback when sanitized result is empty (two-arg form)", () => {
    expect(safeFilenameSegment("", "default")).toBe("default");
    expect(safeFilenameSegment("", "back")).toBe("back");
  });

  it("three-arg form: (text, maxLength, fallback) respects maxLength", () => {
    expect(safeFilenameSegment("hello-world", 5, "x")).toBe("hello");
    expect(safeFilenameSegment("ab", 10, "y")).toBe("ab");
  });

  it("three-arg form returns fallback when result empty", () => {
    expect(safeFilenameSegment("", 60, "file")).toBe("file");
  });

  it("preserves hyphens and alphanumerics", () => {
    expect(safeFilenameSegment("my-file-2024")).toBe("my-file-2024");
    expect(safeFilenameSegment("Project_1")).toBe("Project_1");
  });

  it("normalises multiple spaces to single hyphen", () => {
    expect(safeFilenameSegment("a   b")).toBe("a-b");
  });
});

describe("safeNameForFile", () => {
  it("delegates to safeFilenameSegment with default fallback", () => {
    expect(safeNameForFile("my design")).toBe("my-design");
    expect(safeNameForFile("")).toBe("file");
  });

  it("uses provided fallback when sanitized empty", () => {
    expect(safeNameForFile("", "untitled")).toBe("untitled");
  });
});

describe("filenameTimestamp", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns string matching YYYY-MM-DD-HHmm pattern", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-02-18T14:30:00.000Z"));
    const result = filenameTimestamp();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}-\d{4}$/);
    expect(result.startsWith("2025-02-18-")).toBe(true);
  });

  it("has length 15 (4+2+2+4 digits and three hyphens)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2020-01-01T00:00:00.000Z"));
    expect(filenameTimestamp().length).toBe(15);
  });

  it("date part is ISO date slice (YYYY-MM-DD)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00.000Z"));
    const result = filenameTimestamp();
    expect(result).toMatch(/^2025-06-15-/);
  });
});
