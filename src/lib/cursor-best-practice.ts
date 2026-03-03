/**
 * Best-practice .cursor folder structure for AI-assisted projects.
 * Used to show users which files to create when starting a project.
 */

export type CursorBestPracticeEntry = {
  path: string;
  /** For .md files: short description of what should be inside. Omit for folders. */
  description?: string;
};

export const CURSOR_BEST_PRACTICE_FILES: CursorBestPracticeEntry[] = [
  {
    path: "AGENTS.md",
    description:
      "Brief guidance for AI agents: where things live (e.g. src/, data/, scripts/), conventions (where to put new ADRs, docs), and key paths. One short doc so agents know the project layout.",
  },
  {
    path: ".cursor/AGENTS.md",
    description:
      "Optional duplicate or link to root AGENTS.md. Agent instructions scoped to this repo.",
  },
  {
    path: ".cursor/rules/",
  },
  {
    path: ".cursor/rules/RULE.md",
    description:
      "Project-wide Cursor rules: coding style, patterns, tech stack. What to do when creating or editing files. Can reference other rules in the same folder.",
  },
  {
    path: ".cursor/adr/",
  },
  {
    path: ".cursor/adr/README.md",
    description:
      "Optional index of Architecture Decision Records. Note that ADRs live here; keep in sync when adding or changing decisions.",
  },
  {
    path: "FEATURES.md",
    description:
      "Feature list or scope: main features, milestones, or link to project management. Helps AI understand what the project does and what to build next.",
  },
  {
    path: "README.md",
    description:
      "Project overview: what the repo is, how to run and test, main entry points. One or two paragraphs for humans and AI.",
  },
];
