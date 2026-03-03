/** Unit tests for ticket-parsing: normalizeTicketParsed, extractTicketJsonFromStdout. */
import { describe, it, expect } from "vitest";
import { normalizeTicketParsed, extractTicketJsonFromStdout } from "../ticket-parsing";

describe("normalizeTicketParsed", () => {
  it("returns undefined for missing or non-string fields", () => {
    expect(normalizeTicketParsed({})).toEqual({
      title: undefined,
      description: undefined,
      priority: undefined,
      featureName: undefined,
    });
  });

  it("passes through string title, description, priority", () => {
    expect(
      normalizeTicketParsed({
        title: "Fix bug",
        description: "Details here",
        priority: "P1",
      })
    ).toEqual({
      title: "Fix bug",
      description: "Details here",
      priority: "P1",
      featureName: undefined,
    });
  });

  it("accepts feature_name (snake_case) from agents", () => {
    expect(normalizeTicketParsed({ feature_name: "Auth" })).toEqual({
      title: undefined,
      description: undefined,
      priority: undefined,
      featureName: "Auth",
    });
  });

  it("prefers featureName over feature_name when both present", () => {
    expect(
      normalizeTicketParsed({ featureName: "A", feature_name: "B" })
    ).toEqual({
      title: undefined,
      description: undefined,
      priority: undefined,
      featureName: "A",
    });
  });

  it("ignores non-string values", () => {
    expect(
      normalizeTicketParsed({
        title: 123,
        description: null,
        priority: ["P1"],
        featureName: 0,
      })
    ).toEqual({
      title: undefined,
      description: undefined,
      priority: undefined,
      featureName: undefined,
    });
  });
});

describe("extractTicketJsonFromStdout", () => {
  it("returns null for empty or whitespace", () => {
    expect(extractTicketJsonFromStdout("")).toBeNull();
    expect(extractTicketJsonFromStdout("   \n  ")).toBeNull();
  });

  it("returns null when no brace present", () => {
    expect(extractTicketJsonFromStdout("just some text")).toBeNull();
  });

  it("extracts plain JSON object", () => {
    const out = extractTicketJsonFromStdout('{"title":"T","priority":"P1"}');
    expect(out).toEqual({ title: "T", description: undefined, priority: "P1", featureName: undefined });
  });

  it("extracts JSON from markdown code block", () => {
    const stdout = `
Here is the ticket:
\`\`\`json
{"title": "Add login", "description": "Implement auth", "priority": "P0"}
\`\`\`
`;
    expect(extractTicketJsonFromStdout(stdout)).toEqual({
      title: "Add login",
      description: "Implement auth",
      priority: "P0",
      featureName: undefined,
    });
  });

  it("extracts JSON from code block without json label", () => {
    const stdout = "```\n{\"title\":\"X\"}\n```";
    expect(extractTicketJsonFromStdout(stdout)).toEqual({
      title: "X",
      description: undefined,
      priority: undefined,
      featureName: undefined,
    });
  });

  it("normalizes snake_case feature_name from stdout", () => {
    const stdout = '{"title":"T","feature_name":"My Feature"}';
    expect(extractTicketJsonFromStdout(stdout)).toEqual({
      title: "T",
      description: undefined,
      priority: undefined,
      featureName: "My Feature",
    });
  });

  it("returns null for invalid JSON", () => {
    expect(extractTicketJsonFromStdout("{ invalid }")).toBeNull();
    expect(extractTicketJsonFromStdout("not json at all")).toBeNull();
  });

  it("returns null for array root", () => {
    expect(extractTicketJsonFromStdout("[1,2,3]")).toBeNull();
  });

  it("uses first complete object when multiple braces exist", () => {
    const stdout = 'prefix {"title":"First"} more {"title":"Second"}';
    const out = extractTicketJsonFromStdout(stdout);
    expect(out?.title).toBe("First");
  });
});
