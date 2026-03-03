/**
 * Parse and build skill markdown (SKILL.md / skill.md) into structured form fields.
 * Structure: # Title, description, ## When to use, ## What to do, ## Important, and optional sections.
 */

export interface SkillFormFields {
  title: string;
  description: string;
  whenToUse: string;
  whatToDo: string;
  important: string;
  /** Extra ## sections in order: heading + content (no ## prefix in content). */
  extraSections: { heading: string; content: string }[];
}

const DEFAULT_FIELDS: SkillFormFields = {
  title: "",
  description: "",
  whenToUse: "",
  whatToDo: "",
  important: "",
  extraSections: [],
};

function normalizeSectionHeading(h: string): string {
  return h
    .replace(/^#+\s*/, "")
    .trim()
    .toLowerCase()
    .replace(/:+$/, "")
    .trim();
}

/**
 * Parse skill markdown into form fields.
 * Handles: # Title (single or double newline), description, ## When to use / What to do / Important, and other ## sections.
 */
export function parseSkillMarkdown(md: string): SkillFormFields {
  const out: SkillFormFields = { ...DEFAULT_FIELDS, extraSections: [] };
  const raw = md?.trim() ?? "";
  if (!raw) return out;

  const sections = raw.split(/(?=^\s*##\s+)/m);
  let first = sections[0]?.trim() ?? "";

  // First block: # Title (to first newline) and optional description (rest of block)
  const titleLineMatch = first.match(/^#\s+(.+?)(?:\n|$)/s);
  if (titleLineMatch) {
    out.title = titleLineMatch[1].trim();
    const afterTitle = first.slice(titleLineMatch[0].length).trim();
    if (afterTitle) out.description = afterTitle;
  } else if (first) {
    out.description = first;
  }

  for (let i = 1; i < sections.length; i++) {
    const block = sections[i].trim();
    const headingMatch = block.match(/^\s*##\s+(.+?)(?:\n|$)/);
    if (!headingMatch) continue;
    const heading = headingMatch[1].trim();
    const content = block.slice(headingMatch[0].length).trim();
    const normalized = normalizeSectionHeading(heading);
    if (normalized === "when to use") out.whenToUse = stripListMarkers(content, "bullet");
    else if (normalized === "what to do") out.whatToDo = stripListMarkers(content, "numbered");
    else if (normalized === "important") out.important = stripListMarkers(content, "bullet");
    else out.extraSections.push({ heading, content });
  }

  return out;
}

/** Strip leading - / * or 1. 2. etc and return one item per line. */
function stripListMarkers(text: string, kind: "bullet" | "numbered"): string {
  return text
    .split(/\n/)
    .map((line) => {
      const t = line.trim();
      if (!t) return "";
      if (kind === "bullet") return t.replace(/^[-*]\s*/, "").trim();
      return t.replace(/^\d+\.\s*/, "").trim();
    })
    .filter((s) => s.length > 0)
    .join("\n");
}

/**
 * Build skill markdown from form fields.
 * Bullets for When to use / Important; numbered for What to do.
 */
export function buildSkillMarkdown(f: SkillFormFields): string {
  const parts: string[] = [];

  if (f.title) parts.push(`# ${f.title}`);
  if (f.description) parts.push(f.description);

  if (f.whenToUse.trim()) {
    parts.push("## When to use");
    parts.push(linesToBullets(f.whenToUse));
  }
  if (f.whatToDo.trim()) {
    parts.push("## What to do");
    parts.push(linesToNumbered(f.whatToDo));
  }
  if (f.important.trim()) {
    parts.push("## Important");
    parts.push(linesToBullets(f.important));
  }
  for (const { heading, content } of f.extraSections) {
    if (!heading) continue;
    parts.push(`## ${heading}`);
    parts.push(content.trim());
  }

  return parts.join("\n\n");
}

/**
 * Parse multiple skills from markdown (split on top-level # sections).
 * Each # heading becomes a separate skill.
 */
export function parseMultipleSkills(md: string): SkillFormFields[] {
  const raw = md?.trim() ?? "";
  if (!raw) return [];

  // Split on top-level # (must be start of line, not ## or ###)
  const skillBlocks = raw.split(/(?=^\s*#\s+(?!#))/m);

  return skillBlocks
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => parseSkillMarkdown(block));
}

/**
 * Build markdown from multiple skills.
 * Joins them with a blank line separator.
 */
export function buildMultipleSkillsMarkdown(skills: SkillFormFields[]): string {
  return skills
    .map((skill) => buildSkillMarkdown(skill))
    .join("\n\n");
}

function linesToBullets(text: string): string {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `- ${line}`)
    .join("\n");
}

function linesToNumbered(text: string): string {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => `${i + 1}. ${line}`)
    .join("\n");
}
