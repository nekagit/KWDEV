/**
 * Parse and serialize .cursor/0. ideas/ideas.md for the project Ideas tab.
 * Supports: (1) #### N. Title + body blocks separated by ---, (2) simple - [ ] or - lines.
 */

export type IdeaBlock = {
  id: string;
  /** Display title (e.g. "Command Palette (⌘K)") */
  title: string;
  /** Full body markdown (may be multi-line) */
  body: string;
  /** Original raw block for serialization (to preserve formatting) */
  raw: string;
};

export type ParsedIdeasDoc = {
  /** Everything before the first idea block (headings, vision, etc.) */
  intro: string;
  /** Ordered list of idea blocks */
  ideas: IdeaBlock[];
  /** "numbered" = #### N. Title blocks, "bullets" = - [ ] lines */
  format: "numbered" | "bullets";
};

const NUMBERED_BLOCK_RE = /(?=####\s+\d+\.)/;
const BULLET_LINE_RE = /^\s*-\s*(\[.\])?\s*(.+)$/;

/**
 * Split ideas.md into intro + idea blocks.
 * Detects format: if we find "#### 1." we use numbered blocks; else we use bullet lines.
 */
export function parseIdeasMd(content: string): ParsedIdeasDoc {
  const trimmed = content.trim();
  if (!trimmed) {
    return { intro: "", ideas: [], format: "bullets" };
  }

  // Check for numbered format (#### 1. ..., #### 2. ...)
  const firstNumbered = trimmed.search(/\n####\s+\d+\./);
  if (firstNumbered >= 0) {
    const intro = trimmed.slice(0, firstNumbered).trimEnd();
    const rest = trimmed.slice(firstNumbered).replace(/^\n+/, "");
    const blocks = rest.split(NUMBERED_BLOCK_RE).filter((s) => s.trim());
    const ideas: IdeaBlock[] = blocks.map((block, index) => {
      const raw = block.trim();
      const firstLineEnd = raw.indexOf("\n");
      const firstLine = firstLineEnd >= 0 ? raw.slice(0, firstLineEnd) : raw;
      const bodyRaw = firstLineEnd >= 0 ? raw.slice(firstLineEnd + 1).trim() : "";
      const titleMatch = firstLine.match(/^####\s+\d+\.\s*(.+)$/);
      const title = titleMatch ? titleMatch[1].trim() : firstLine.replace(/^#+\s*\d*\.?\s*/, "").trim() || "Untitled";
      return {
        id: `idea-${index}`,
        title,
        body: bodyRaw,
        raw,
      };
    });
    return { intro, ideas, format: "numbered" };
  }

  // Bullet format: intro = before first "- ", ideas = each "- " line
  const lines = trimmed.split("\n");
  let introEnd = 0;
  for (let i = 0; i < lines.length; i++) {
    if (BULLET_LINE_RE.test(lines[i])) {
      introEnd = i;
      break;
    }
    introEnd = i + 1;
  }
  const intro = lines.slice(0, introEnd).join("\n").trimEnd();
  const ideaLines = lines.slice(introEnd).filter((l) => BULLET_LINE_RE.test(l));
  const ideas: IdeaBlock[] = ideaLines.map((line, index) => {
    const m = line.match(BULLET_LINE_RE);
    const text = m ? m[2].trim() : line.replace(/^\s*-\s*(\[.\])?\s*/, "").trim();
    return {
      id: `bullet-${index}`,
      title: text.slice(0, 80) + (text.length > 80 ? "…" : ""),
      body: "",
      raw: line.trim(),
    };
  });
  return { intro, ideas, format: "bullets" };
}

/**
 * Serialize ParsedIdeasDoc back to ideas.md string.
 * When deleting/adding we pass the updated ideas array and preserve format.
 */
export function serializeIdeasMd(
  intro: string,
  ideas: IdeaBlock[],
  format: "numbered" | "bullets"
): string {
  const introBlock = intro.trimEnd();
  if (format === "bullets") {
    const bulletLines = ideas.map((i) => {
      if (i.raw.startsWith("- ")) return i.raw;
      const text = i.body ? `${i.title}\n${i.body}` : i.title;
      return `- [ ] ${text.split("\n")[0].trim()}`;
    });
    return introBlock ? [introBlock, "", ...bulletLines].join("\n") : bulletLines.join("\n");
  }
  const numberedBlocks = ideas.map((idea, index) => {
    const num = index + 1;
    return `#### ${num}. ${idea.title}\n\n${idea.body.trim() || ""}`.trimEnd();
  });
  const separator = "\n\n---\n\n";
  const blocks = numberedBlocks.join(separator);
  return introBlock ? [introBlock, "", "---", "", blocks].join("\n") : blocks;
}

/**
 * Use first line of improved text as title, rest as body.
 */
export function improvedTextToTitleAndBody(improved: string): { title: string; body: string } {
  const t = improved.trim();
  const firstLineEnd = t.indexOf("\n");
  const title = firstLineEnd >= 0 ? t.slice(0, firstLineEnd).trim() : t;
  const body = firstLineEnd >= 0 ? t.slice(firstLineEnd + 1).trim() : "";
  return {
    title: title.replace(/^#+\s*/, "").slice(0, 200),
    body,
  };
}

/**
 * Build a new idea block for "numbered" format (for appending after AI improve).
 */
export function buildNumberedBlock(title: string, body: string, nextIndex: number): IdeaBlock {
  const raw = `#### ${nextIndex}. ${title}\n\n${body.trim()}`;
  return {
    id: `idea-${nextIndex}`,
    title,
    body: body.trim(),
    raw,
  };
}

/**
 * Build a new idea for "bullets" format.
 */
export function buildBulletBlock(text: string): IdeaBlock {
  const raw = `- [ ] ${text.trim()}`;
  return {
    id: `bullet-${Date.now()}`,
    title: text.slice(0, 80) + (text.length > 80 ? "…" : ""),
    body: "",
    raw,
  };
}

/* ═══ Structured roadmap format (## sections + #### ideas) for full ideas.md ═══ */

export type IdeasStructuredSection = {
  id: string;
  /** Section title (e.g. "2. Tier 1 — High-Impact, Near-Term Ideas") */
  title: string;
  /** Raw markdown before any #### in this section */
  content: string;
  /** Idea blocks (#### N. Title) when present */
  ideas: IdeaBlock[];
};

export type IdeasStructuredDoc = {
  sections: IdeasStructuredSection[];
  /** True if doc has ## section headers (roadmap format) */
  isStructured: boolean;
};

const SECTION_HEADER_RE = /^##\s+(.+)$/gm;
const IDEA_HEADER_RE = /^####\s+(\d+|[^\n]+)\.\s*(.+)$/;

/**
 * Parse ideas.md with ## sections. Each section can have optional #### N. Idea blocks.
 * Used by the Ideas tab to render a tailored UI (sections + idea cards).
 */
export function parseIdeasMdStructured(content: string): IdeasStructuredDoc {
  const trimmed = content.trim();
  if (!trimmed) {
    return { sections: [], isStructured: false };
  }

  const sectionSplits: { index: number; title: string }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(SECTION_HEADER_RE.source, "gm");
  while ((m = re.exec(trimmed)) !== null) {
    sectionSplits.push({ index: m.index, title: m[1].trim() });
  }

  if (sectionSplits.length === 0) {
    return { sections: [], isStructured: false };
  }

  const sections: IdeasStructuredSection[] = [];
  const preamble = sectionSplits[0].index > 0 ? trimmed.slice(0, sectionSplits[0].index).trim() : "";
  if (preamble) {
    sections.push({
      id: "section-preamble",
      title: "Overview",
      content: preamble,
      ideas: [],
    });
  }

  sectionSplits.forEach((split, i) => {
    const start = split.index;
    const end = sectionSplits[i + 1]?.index ?? trimmed.length;
    const sectionText = trimmed.slice(start, end).trim();
    const firstLineEnd = sectionText.indexOf("\n");
    const firstLine = firstLineEnd >= 0 ? sectionText.slice(0, firstLineEnd) : sectionText;
    const afterTitle = firstLineEnd >= 0 ? sectionText.slice(firstLineEnd + 1).trim() : "";
    const title = firstLine.replace(/^##\s+/, "").trim();

    const firstIdeaIdx = afterTitle.search(/\n####\s+/);
    const contentBeforeIdeas = firstIdeaIdx >= 0 ? afterTitle.slice(0, firstIdeaIdx).trim() : afterTitle;
    const ideasPart = firstIdeaIdx >= 0 ? afterTitle.slice(firstIdeaIdx).trim() : "";
    const ideaBlocks = ideasPart ? ideasPart.split(/(?=####\s+)/).filter((s) => s.trim()) : [];
    const ideas: IdeaBlock[] = [];
    for (const block of ideaBlocks) {
      const ideaMatch = block.match(/^####\s+(?:\d+\.|[^\n]+\.)\s*([\s\S]+?)(?=\n|$)/);
      if (ideaMatch) {
        const ideaTitle = ideaMatch[1].trim();
        const bodyStart = block.indexOf("\n");
        const bodyRaw = bodyStart >= 0 ? block.slice(bodyStart + 1).trim() : "";
        ideas.push({
          id: `sec-${i}-idea-${ideas.length}`,
          title: ideaTitle,
          body: bodyRaw,
          raw: block.trim(),
        });
      }
    }

    sections.push({
      id: `section-${i}`,
      title,
      content: contentBeforeIdeas,
      ideas,
    });
  });

  return { sections, isStructured: sections.length > 0 };
}

/** Fields extracted from an idea body (e.g. **Problem:**, **Solution:**) for card display */
export type IdeaFields = {
  problem?: string;
  solution?: string;
  aiIntegration?: string;
  userFlow?: string;
  technicalApproach?: string;
  dependencies?: string;
  effort?: string;
  impact?: string;
  successMetrics?: string;
};

const FIELD_LABELS: { key: keyof IdeaFields; pattern: RegExp }[] = [
  { key: "problem", pattern: /\*\*Problem:\*\*[ \t]*([\s\S]*?)(?=\n\s*\*\*|$)/i },
  { key: "solution", pattern: /\*\*Solution:\*\*[ \t]*([\s\S]*?)(?=\n\s*\*\*|$)/i },
  { key: "aiIntegration", pattern: /\*\*AI Integration:\*\*[ \t]*([\s\S]*?)(?=\n\s*\*\*|$)/i },
  { key: "userFlow", pattern: /\*\*User Flow:\*\*[ \t]*([\s\S]*?)(?=\n\s*\*\*|$)/i },
  { key: "technicalApproach", pattern: /\*\*Technical Approach:\*\*[ \t]*([\s\S]*?)(?=\n\s*\*\*|$)/i },
  { key: "dependencies", pattern: /\*\*Dependencies:\*\*[ \t]*([\s\S]*?)(?=\n\s*\*\*|$)/i },
  { key: "effort", pattern: /\*\*Effort:\*\*[ \t]*([\s\S]*?)(?=\n\s*\*\*|$)/i },
  { key: "impact", pattern: /\*\*Impact:\*\*[ \t]*([\s\S]*?)(?=\n\s*\*\*|$)/i },
  { key: "successMetrics", pattern: /\*\*Success Metrics:\*\*[ \t]*([\s\S]*?)(?=\n\s*\*\*|$)/i },
];

/**
 * Extract structured fields from an idea body (Problem, Solution, Impact, etc.) for display in cards.
 */
export function getIdeaFields(body: string): IdeaFields {
  const fields: IdeaFields = {};
  for (const { key, pattern } of FIELD_LABELS) {
    const match = body.match(pattern);
    if (match) {
      const value = match[1].trim();
      if (value) (fields as Record<string, string>)[key] = value;
    }
  }
  return fields;
}
