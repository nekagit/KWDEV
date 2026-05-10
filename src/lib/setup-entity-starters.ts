/**
 * Default Setup tab rows (Architecture, Testing, Security, Design, Rules, Skills, MCP, Agents).
 * Pure merges — callers persist via setup-entities DB helpers.
 */

export type StarterEntityRow = {
  id: string;
  name: string;
  description: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
};

/** Categories seeded for rules (each Setup rule tab filters by category; "general" appears on the combined Rules tab). */
export const RULE_STARTER_CATEGORIES = ["architecture", "testing", "security", "design", "general"] as const;

const RULE_TEMPLATES: Array<{
  category: string;
  name: string;
  description: string;
  content: string;
}> = [
  {
    category: "architecture",
    name: "Layer boundaries",
    description: "Keep modules decoupled and dependencies pointed inward.",
    content:
      "- Prefer clear module boundaries (features, domains, or layers).\n" +
      "- Avoid circular imports; extract shared types/utilities to a neutral module.\n" +
      "- Document major boundaries in ADRs when they change.",
  },
  {
    category: "testing",
    name: "Test pyramid balance",
    description: "Fast unit tests first; integration where behavior crosses boundaries.",
    content:
      "- Add or update tests for behavior you change; prefer fast unit tests for pure logic.\n" +
      "- Use integration/e2e for critical paths and regressions you have seen in production.\n" +
      "- Keep fixtures small and explicit; avoid flaky sleeps — prefer deterministic waits.",
  },
  {
    category: "security",
    name: "Secrets and trust boundaries",
    description: "Never commit secrets; validate untrusted input at boundaries.",
    content:
      "- Do not commit API keys, tokens, or certificates; use env / secret stores.\n" +
      "- Validate and encode untrusted input at API and UI boundaries.\n" +
      "- Prefer least-privilege credentials for automation and CI.",
  },
  {
    category: "design",
    name: "Consistency and accessibility",
    description: "Align with the design system; ship usable defaults.",
    content:
      "- Reuse shared layout, typography, and color tokens instead of one-off styles.\n" +
      "- Preserve keyboard navigation and visible focus; label interactive controls.\n" +
      "- Prefer progressive enhancement — core flows work without fragile layout assumptions.",
  },
  {
    category: "general",
    name: "Project conventions",
    description: "Cross-cutting habits for this repository.",
    content:
      "- Match existing naming, file layout, and formatting before introducing new patterns.\n" +
      "- Keep changes scoped; separate refactors from feature work when possible.\n" +
      "- Reference PROJECT.md or team docs when intent or scope is unclear.",
  },
];

export const SKILL_STARTER_NAMES = ["Explain-before-edit", "Test-after-change"] as const;

const SKILL_TEMPLATES: Array<{ name: string; description: string; content: string }> = [
  {
    name: "Explain-before-edit",
    description: "Clarify intent and risks before modifying code.",
    content:
      "Before editing files:\n" +
      "- State the goal and acceptance criteria in one short paragraph.\n" +
      "- List files or modules you expect to touch.\n" +
      "- Call out risks (data migration, API compatibility, concurrency).",
  },
  {
    name: "Test-after-change",
    description: "Run the right checks after substantive edits.",
    content:
      "After changes:\n" +
      "- Run targeted unit tests for touched modules.\n" +
      "- Run lint/typecheck when project conventions require it.\n" +
      "- For user-visible flows, smoke-test the minimal happy path.",
  },
];

const MCP_TEMPLATE_JSON = `{
  "mcpServers": {
    "example-local": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-example"]
    }
  }
}`;

const AGENT_STARTER_MARKDOWN = `---
name: Repository assistant
description: Default starter agent scoped to this project
---

You help developers work in this repository. Prefer small, reviewable changes. Follow existing patterns and PROJECT.md when present. Ask before large refactors or dependency upgrades.
`;

/** Insert missing category rows (stable ids) ahead of existing records. */
export function mergeRuleStarters(current: StarterEntityRow[], isoNow: string): StarterEntityRow[] {
  const cats = new Set(current.map((r) => (r.category ?? "").trim().toLowerCase()));
  const additions: StarterEntityRow[] = [];
  for (const t of RULE_TEMPLATES) {
    const key = t.category.trim().toLowerCase();
    if (cats.has(key)) continue;
    cats.add(key);
    additions.push({
      id: `starter-rule-${key}`,
      name: t.name,
      description: t.description,
      content: t.content,
      category: t.category,
      createdAt: isoNow,
      updatedAt: isoNow,
    });
  }
  if (!additions.length) return current;
  return [...additions, ...current];
}

export function mergeSkillStarters(current: StarterEntityRow[], isoNow: string): StarterEntityRow[] {
  const names = new Set(current.map((r) => r.name.trim().toLowerCase()));
  const additions: StarterEntityRow[] = [];
  for (const t of SKILL_TEMPLATES) {
    const key = t.name.trim().toLowerCase();
    if (names.has(key)) continue;
    names.add(key);
    additions.push({
      id: `starter-skill-${key.replace(/[^a-z0-9]+/gi, "-")}`,
      name: t.name,
      description: t.description,
      content: t.content,
      createdAt: isoNow,
      updatedAt: isoNow,
    });
  }
  if (!additions.length) return current;
  return [...additions, ...current];
}

/** One MCP template row when the project has no MCP entries yet. */
export function mergeMcpStarters(current: StarterEntityRow[], isoNow: string): StarterEntityRow[] {
  if (current.length > 0) return current;
  return [
    {
      id: "starter-mcp-template",
      name: "Example MCP configuration",
      description: "Template JSON — replace servers with your Cursor MCP definitions.",
      content: MCP_TEMPLATE_JSON,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];
}

/** One default agent when none exist (markdown body + optional frontmatter). */
export function mergeAgentStarters(current: StarterEntityRow[], isoNow: string): StarterEntityRow[] {
  if (current.length > 0) return current;
  return [
    {
      id: "starter-agent-default",
      name: "Repository assistant",
      description: "Default starter agent for this project",
      content: AGENT_STARTER_MARKDOWN,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];
}
