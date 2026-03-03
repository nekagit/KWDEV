/**
 * Best-practice prompt for Cursor: run this in the project repo. The model will
 * analyze the codebase and generate documents in the project's .cursor folder.
 */

export const ANALYSIS_PROMPT = `You are a senior engineer and architect. Analyze this codebase and write the following documents into the project's \`.cursor\` folder. Create the folder if it does not exist. Write real files; do not output inline only.

## Documents to generate (all under \`.cursor/\`)

1. **ANALYSIS.md** – Overall analysis (required)
   - **Current state**: 2–5 sentences on tech stack, structure, what is implemented, main entry points.
   - **Architecture**: What architecture or patterns are in use (e.g. clean, hexagonal, REST, layered). If unclear, suggest one. Use categories: ddd, tdd, bdd, dry, solid, kiss, yagni, clean, hexagonal, cqrs, event_sourcing, microservices, rest, graphql, scenario.
   - **Design** (if UI app): Pages, layout, components, design system or UI patterns.
   - **Features implemented**: Bullet list of 3–15 features clearly present in the code (short title + optional one-line description).
   - **Missing or incomplete features**: Bullet list of 3–15 missing/incomplete features with short rationale.
   - **Errors and risks**: 0–10 items: anti-patterns, missing tests, security/performance risks, tech debt. For each: severity (error/warning/info), message, optional file/location.

2. **architecture.md** (optional but recommended)
   - Name and category of the architecture.
   - Description, main practices, when to use / scenarios.
   - References, anti-patterns to avoid, brief examples if helpful.

3. **design.md** (optional, for UI apps)
   - Design system or UI overview: colors, typography, layout, key sections/pages.
   - Template type if applicable: landing, dashboard, product, auth, docs, etc.



5. **errors.md** (optional)
   - List of errors, warnings, and info items with location and recommendation.

## Rules

- Write in clear markdown. Use headers, lists, and code blocks where useful.
- Base everything on the actual codebase; do not invent files or features.
- Create \`.cursor\` and write the files. At minimum produce \`.cursor/ANALYSIS.md\`.
- Be concise but actionable. Future work (e.g. Cursor sessions) will use these docs.`;

export const ANALYSIS_PROMPT_FILENAME = "analysis-prompt.md";

/** Build prompt for design-only analysis; writes to .cursor/design.md */
export function buildDesignAnalysisPromptRecord(opts: {
  projectName: string;
  designNames: string[];
}): string {
  return `You are a senior engineer. Analyze this codebase for **design and UI**. Project: ${opts.projectName}.${opts.designNames.length ? ` Linked design names: ${opts.designNames.join(", ")}.` : ""}

Write the result to \`.cursor/design.md\` in the project root. Create \`.cursor\` if needed. Include: design system (colors, typography, layout), key pages/sections, components, and how they map to the code. Use clear markdown. Base everything on the actual codebase.`;
}

/** Build prompt for architecture-only analysis; writes to .cursor/architecture.md */
export function buildArchitectureAnalysisPromptRecord(opts: {
  projectName: string;
  architectureNames: string[];
}): string {
  return `You are a senior engineer. Analyze this codebase for **architecture and patterns**. Project: ${opts.projectName}.${opts.architectureNames.length ? ` Linked architecture names: ${opts.architectureNames.join(", ")}.` : ""}

Write the result to \`.cursor/architecture.md\` in the project root. Create \`.cursor\` if needed. Include: layers, patterns (e.g. clean, hexagonal, REST), dependencies, and where they appear in the code. Use clear markdown. Base everything on the actual codebase.`;
}

/** Build prompt for tickets/work analysis; writes .cursor/7. planner/tickets.md (checklist by feature) and .cursor/7. planner/features.md in one run. */
export function buildTicketsAnalysisPromptRecord(opts: {
  projectName: string;
  ticketSummaries: { title: string; status: string }[];
}): string {
  return `You are a senior engineer. Analyze this codebase and suggest **work items (tickets)** as a checklist, categorized by **features**. Project: ${opts.projectName}.${opts.ticketSummaries.length ? ` Existing tickets: ${opts.ticketSummaries.map((t) => `${t.title} (${t.status})`).join("; ")}.` : ""}

**Requirements (see \`.cursor/tickets-format.md\` and \`.cursor/features-tickets-correlation.md\` if present; \`.cursor/sync.md\` lists what must stay in sync). The project details page parses these files for Kanban and JSON — follow the format exactly.**

**You must create two files in the same run so they stay in sync:**

1. **\`.cursor/7. planner/tickets.md\`** — Work items in **checklist format** so the AI or user can check off finished tickets. Follow the structure in \`.cursor/tickets-format.md\` if present. Requirements:
   - **Required sections in order:** Title (H1), Metadata block (Project, Source, Last updated), horizontal rule, \`## Summary: Done vs missing\` (Done table, Missing table), horizontal rule, \`## Prioritized work items (tickets)\`, then \`### P0 — Critical / foundation\`, \`### P1 — High / quality and maintainability\`, \`### P2 — Medium / polish and scale\`, \`### P3 — Lower / later\`. Under each priority use \`#### Feature: <name>\` and list tickets as checklist items.
   - Use GFM task lists: \`- [ ] #N Title — short description\` for open, \`- [x] #N Title — short description\` for done. Every ticket must appear under exactly one \`#### Feature:\` subsection.
   - Add \`## Next steps\` with a numbered list at the end. Base everything on the actual codebase.



**Exact format for Kanban/JSON parsing (use these patterns so the project details page can display the board):**
- **tickets.md** — Each ticket line must be exactly: \`- [ ] #N Title — description\` or \`- [x] #N Title — description\` (space inside brackets; em dash before description; \`#### Feature: Name\` on the line above the ticket list).


Create the \`.cursor\` folder if needed. Write both files in one run so feature names and ticket numbers match. This keeps tickets (checklist) and features (grouping) aligned and ensures the Kanban/JSON view on the project details page parses correctly. Base everything on the actual codebase.`;
}



/** Kanban/board data for context injection (avoids circular dependency). */
export type KanbanContextData = {

  tickets: { number: number; title: string; priority: string; featureName: string; done: boolean }[];
};

/**
 * Build a context block from the Kanban board (features + tickets) to prepend to any prompt.
 * This block is always combined with the user's chosen prompt so the model has current scope.
 */
export function buildKanbanContextBlock(data: KanbanContextData): string {
  const lines: string[] = [
    "## Current scope (from Kanban — .cursor/7. planner/tickets.md)",
    "",
    "Use the following features and tickets as context. They are parsed from the project's Kanban board.",
    "",
  ];

  if (data.tickets.length > 0) {
    lines.push("### Tickets (by priority)");
    (["P0", "P1", "P2", "P3"] as const).forEach((p) => {
      const byP = data.tickets.filter((t) => t.priority === p);
      if (byP.length === 0) return;
      lines.push(`#### ${p}`);
      byP.forEach((t) => {
        lines.push(`- ${t.done ? "[x]" : "[ ]"} #${t.number} ${t.title}${t.featureName ? ` (${t.featureName})` : ""}`);
      });
      lines.push("");
    });
  } else {
    lines.push("_No tickets parsed yet. Run Sync on the Todos tab after creating .cursor/7. planner/tickets.md._");
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * Combine Kanban context with the user's prompt. The result always includes features and tickets first.
 */
export function combinePromptRecordWithKanban(kanbanContext: string, userPromptRecord: string): string {
  const trimmed = (userPromptRecord ?? "").trim();
  if (!trimmed) return kanbanContext;
  return `${kanbanContext}\n\n---\n\n${trimmed}`;
}

/** Minimal ticket shape for building a per-ticket prompt (matches ParsedTicket). */
export type TicketPromptTicket = {
  number: number;
  title: string;
  description?: string;
  priority: string;
  featureName: string;
  agents?: string[];
};

/**
 * Build the combined prompt block for one ticket: ticket details + optional agent instructions.
 * Used by Worker "Implement All" when running one terminal per in-progress ticket.
 * @param ticket - Ticket fields (number, title, description, priority, featureName, agents).
 * @param agentMdContent - Concatenated content of .cursor/2. agents/<id>.md for each ticket.agents, or null/empty.
 */
export function buildTicketPromptBlock(ticket: TicketPromptTicket, agentMdContent: string | null): string {
  const agents = ticket.agents?.length ? ticket.agents : undefined;
  const lines: string[] = [
    "## Ticket",
    "",
    `**#${ticket.number}** — ${ticket.title}`,
    "",
    `- **Priority:** ${ticket.priority}`,
    `- **Feature:** ${ticket.featureName || "—"}`,
    ...(agents?.length ? [`- **Agents:** ${agents.map((a) => `@${a}`).join(", ")}`] : []),
    "",
  ];
  if (ticket.description?.trim()) {
    lines.push("### Description", "", ticket.description.trim(), "");
  }
  const agentContent = (agentMdContent ?? "").trim();
  if (agentContent) {
    lines.push("---", "", "## Agent instructions", "", agentContent, "");
  }
  return lines.join("\n");
}

/**
 * Combine ticket+agent prompt block with the user's selected prompt (e.g. from Command Center).
 */
export function combineTicketPromptWithUserPrompt(ticketBlock: string, userPromptRecord: string): string {
  const trimmed = (userPromptRecord ?? "").trim();
  if (!trimmed) return ticketBlock;
  return `${ticketBlock}\n\n---\n\n${trimmed}`;
}
