/**
 * Kanban/ticket prompt blocks used by ProjectRunTab and ProjectTicketsTab.
 * Extracted from former analysis-prompt (analyzer feature removed).
 */

/** Kanban/board data for context injection. */
export type KanbanContextData = {
  tickets: { number: number; title: string; priority: string; featureName: string; done: boolean }[];
};

/**
 * Build a context block from the Kanban board (features + tickets) to prepend to any prompt.
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
 * Combine Kanban context with the user's prompt.
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
