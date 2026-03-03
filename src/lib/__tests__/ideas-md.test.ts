/**
 * Unit tests for ideas-md: parse/serialize .cursor/0. ideas/ideas.md.
 */
import { describe, it, expect } from "vitest";
import {
  parseIdeasMd,
  serializeIdeasMd,
  improvedTextToTitleAndBody,
  buildNumberedBlock,
  buildBulletBlock,
  parseIdeasMdStructured,
  getIdeaFields,
} from "../ideas-md";

describe("parseIdeasMd", () => {
  it("returns empty intro and ideas for empty content", () => {
    expect(parseIdeasMd("")).toEqual({ intro: "", ideas: [], format: "bullets" });
    expect(parseIdeasMd("   \n\n  ")).toEqual({ intro: "", ideas: [], format: "bullets" });
  });

  it("parses numbered format (#### N. Title)", () => {
    const content = [
      "# Vision",
      "",
      "#### 1. Command Palette",
      "",
      "Shortcut ⌘K.",
      "",
      "#### 2. Dark mode",
      "",
      "Theme toggle.",
    ].join("\n");
    const parsed = parseIdeasMd(content);
    expect(parsed.format).toBe("numbered");
    expect(parsed.intro).toContain("# Vision");
    expect(parsed.ideas).toHaveLength(2);
    expect(parsed.ideas[0].title).toBe("Command Palette");
    expect(parsed.ideas[0].body).toContain("Shortcut ⌘K.");
    expect(parsed.ideas[1].title).toBe("Dark mode");
    expect(parsed.ideas[1].body).toContain("Theme toggle.");
  });

  it("parses bullet format (- [ ] or - line)", () => {
    const content = [
      "Ideas list",
      "",
      "- [ ] First idea",
      "- [ ] Second idea",
      "- Another bullet",
    ].join("\n");
    const parsed = parseIdeasMd(content);
    expect(parsed.format).toBe("bullets");
    expect(parsed.intro).toContain("Ideas list");
    expect(parsed.ideas.length).toBeGreaterThanOrEqual(2);
    expect(parsed.ideas[0].title).toContain("First idea");
    expect(parsed.ideas[1].title).toContain("Second idea");
  });
});

describe("serializeIdeasMd", () => {
  it("serializes bullets format", () => {
    const intro = "Intro";
    const ideas = [
      { id: "b0", title: "One", body: "", raw: "- [ ] One" },
      { id: "b1", title: "Two", body: "", raw: "- [ ] Two" },
    ];
    const out = serializeIdeasMd(intro, ideas, "bullets");
    expect(out).toContain("Intro");
    expect(out).toContain("- [ ] One");
    expect(out).toContain("- [ ] Two");
  });

  it("serializes numbered format with separator", () => {
    const intro = "";
    const ideas = [
      { id: "idea-0", title: "First", body: "Body one", raw: "#### 1. First\n\nBody one" },
      { id: "idea-1", title: "Second", body: "Body two", raw: "#### 2. Second\n\nBody two" },
    ];
    const out = serializeIdeasMd(intro, ideas, "numbered");
    expect(out).toContain("#### 1. First");
    expect(out).toContain("Body one");
    expect(out).toContain("#### 2. Second");
    expect(out).toContain("---");
  });
});

describe("improvedTextToTitleAndBody", () => {
  it("splits first line as title, rest as body", () => {
    const result = improvedTextToTitleAndBody("My Title\n\nParagraph one.\nParagraph two.");
    expect(result.title).toBe("My Title");
    expect(result.body).toContain("Paragraph one.");
    expect(result.body).toContain("Paragraph two.");
  });

  it("uses full string as title when no newline", () => {
    const result = improvedTextToTitleAndBody("Only title");
    expect(result.title).toBe("Only title");
    expect(result.body).toBe("");
  });

  it("strips leading # from title", () => {
    const result = improvedTextToTitleAndBody("## Feature name\nBody");
    expect(result.title).toBe("Feature name");
    expect(result.body).toBe("Body");
  });

  it("trims input", () => {
    const result = improvedTextToTitleAndBody("  Title  \n  Body  ");
    expect(result.title).toBe("Title");
    expect(result.body).toBe("Body");
  });
});

describe("buildNumberedBlock", () => {
  it("builds block with id, title, body, raw", () => {
    const block = buildNumberedBlock("My Idea", "Description here.", 3);
    expect(block.id).toBe("idea-3");
    expect(block.title).toBe("My Idea");
    expect(block.body).toBe("Description here.");
    expect(block.raw).toBe("#### 3. My Idea\n\nDescription here.");
  });
});

describe("buildBulletBlock", () => {
  it("builds bullet with raw - [ ] and title truncated at 80 chars", () => {
    const block = buildBulletBlock("Short idea");
    expect(block.raw).toBe("- [ ] Short idea");
    expect(block.title).toBe("Short idea");
    expect(block.body).toBe("");
    expect(block.id).toMatch(/^bullet-\d+$/);
  });

  it("appends ellipsis when text exceeds 80 chars", () => {
    const long = "a".repeat(85);
    const block = buildBulletBlock(long);
    expect(block.title).toHaveLength(81);
    expect(block.title.endsWith("…")).toBe(true);
  });
});

describe("parseIdeasMdStructured", () => {
  it("returns empty sections for empty content", () => {
    expect(parseIdeasMdStructured("")).toEqual({ sections: [], isStructured: false });
    expect(parseIdeasMdStructured("   ")).toEqual({ sections: [], isStructured: false });
  });

  it("returns isStructured false when no ## headers", () => {
    const parsed = parseIdeasMdStructured("Just some text\n\nNo sections.");
    expect(parsed.sections).toEqual([]);
    expect(parsed.isStructured).toBe(false);
  });

  it("parses ## sections with #### ideas", () => {
    const content = [
      "## 1. Tier One",
      "",
      "Intro for tier.",
      "",
      "#### 1. Idea A",
      "",
      "Body A",
      "",
      "#### 2. Idea B",
      "",
      "Body B",
    ].join("\n");
    const parsed = parseIdeasMdStructured(content);
    expect(parsed.isStructured).toBe(true);
    expect(parsed.sections.length).toBeGreaterThanOrEqual(1);
    const section = parsed.sections.find((s) => s.title.includes("Tier One")) ?? parsed.sections[0];
    expect(section.title).toContain("Tier One");
    expect(section.ideas.length).toBeGreaterThanOrEqual(1);
    const ideaA = section.ideas.find((i) => i.title.includes("Idea A"));
    if (ideaA) {
      expect(ideaA.body).toContain("Body A");
    }
  });
});

describe("getIdeaFields", () => {
  it("returns empty object for empty body", () => {
    expect(getIdeaFields("")).toEqual({});
  });

  it("extracts Problem and Solution", () => {
    const body = [
      "**Problem:** Users get lost.",
      "",
      "**Solution:** Add a command palette.",
    ].join("\n");
    const fields = getIdeaFields(body);
    expect(fields.problem).toContain("Users get lost");
    expect(fields.solution).toContain("Add a command palette");
  });

  it("extracts Impact and Effort", () => {
    const body = "**Impact:** High.\n**Effort:** 2 weeks.";
    const fields = getIdeaFields(body);
    expect(fields.impact).toContain("High");
    expect(fields.effort).toContain("2 weeks");
  });

  it("returns only non-empty matches", () => {
    const body = "**Problem:** \n\n**Solution:** Done.";
    const fields = getIdeaFields(body);
    expect(fields.solution).toBe("Done.");
    expect(fields.problem).toBeUndefined();
  });
});
