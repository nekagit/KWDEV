import { describe, expect, it } from "vitest";
import {
  extractPromptTextFromJson,
  getPromptStemFromFileName,
  promptsHaveDrift,
  validatePromptFilePairs,
} from "../prompt-json";

describe("extractPromptTextFromJson", () => {
  it("returns trimmed source_markdown when valid JSON payload is provided", () => {
    const input = JSON.stringify({
      source_file: "night-shift.prompt.md",
      source_markdown: "  # Title\n\nBody\n  ",
    });

    expect(extractPromptTextFromJson(input)).toBe("# Title\n\nBody");
  });

  it("throws when source_markdown is missing", () => {
    const input = JSON.stringify({ source_file: "night-shift.prompt.md" });
    expect(() => extractPromptTextFromJson(input)).toThrow("missing source_markdown");
  });

  it("throws when JSON is invalid", () => {
    expect(() => extractPromptTextFromJson("{ not-json")).toThrow("Invalid prompt JSON");
  });
});

describe("getPromptStemFromFileName", () => {
  it("returns stem for .prompt.md and .prompt.json", () => {
    expect(getPromptStemFromFileName("night-shift.prompt.md")).toBe("night-shift");
    expect(getPromptStemFromFileName("night-shift.prompt.json")).toBe("night-shift");
  });

  it("returns null for unsupported files", () => {
    expect(getPromptStemFromFileName("notes.md")).toBeNull();
    expect(getPromptStemFromFileName("night-shift.json")).toBeNull();
  });
});

describe("validatePromptFilePairs", () => {
  it("reports no errors when each stem has both .md and .json", () => {
    const errors = validatePromptFilePairs([
      "night-shift.prompt.md",
      "night-shift.prompt.json",
      "test.prompt.md",
      "test.prompt.json",
    ]);
    expect(errors).toEqual([]);
  });

  it("reports missing counterparts per stem", () => {
    const errors = validatePromptFilePairs([
      "night-shift.prompt.md",
      "test.prompt.json",
      "project.prompt.md",
      "project.prompt.json",
    ]);

    expect(errors).toEqual([
      "Missing data/prompts/workflows/night-shift.prompt.json (counterpart for night-shift.prompt.md).",
      "Missing data/prompts/workflows/test.prompt.md (counterpart for test.prompt.json).",
    ]);
  });
});

describe("promptsHaveDrift", () => {
  it("returns false for equivalent markdown text", () => {
    const md = "# Title\n\nBody";
    const json = JSON.stringify({ source_markdown: "  # Title\n\nBody\n" });
    expect(promptsHaveDrift(md, json)).toBe(false);
  });

  it("returns true when markdown and JSON source differ", () => {
    const md = "# Title\n\nBody A";
    const json = JSON.stringify({ source_markdown: "# Title\n\nBody B" });
    expect(promptsHaveDrift(md, json)).toBe(true);
  });
});
