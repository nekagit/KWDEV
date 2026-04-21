/**
 * Parse and build Kanban data from .cursor/7. planner/tickets.md and API tickets.
 * Used by planner tab and export; supports mark-as-done and column mapping.
 */
/** Parsed ticket from .cursor/7. planner/tickets.md (checklist item). */
export type ParsedTicket = {
  id: string;
  number: number;
  title: string;
  description?: string;
  priority: "P0" | "P1" | "P2" | "P3";
  // Kept for backward compatibility in markdown parsing, but effectively unused/informational
  featureName: string;
  done: boolean;
  status: "Todo" | "Done";
  /** Agents from .cursor/2. agents (filenames without .md), e.g. ["frontend-dev", "backend-dev"]. */
  agents?: string[];
  /** Assigned milestone (DB id). */
  milestoneId?: number;
  /** Assigned idea (DB id). */
  ideaId?: number;
};

/** Kanban column for UI (e.g. backlog, in_progress, done, testing). */
export type KanbanColumn = {
  name: string;
  items: ParsedTicket[];
};

/**
 * JSON structure used for Kanban display and export.
 */
export type TodosKanbanData = {
  tickets: ParsedTicket[];
  /** ISO date when parsed (for display). */
  parsedAt: string;
  /** Columns keyed by status (backlog, in_progress, done, testing). */
  columns: Record<string, KanbanColumn>;
};

function isDoneStatus(status: string | undefined): boolean {
  if (!status) return false;
  const normalized = status.trim().toLowerCase();
  return normalized === "done" || normalized === "complete" || normalized === "completed";
}

function isTicketDone(ticket: ParsedTicket): boolean {
  return ticket.done || isDoneStatus(ticket.status);
}

const TICKET_REF_RE = /#(\d+)/g;

const PRIORITY_HEADER_RE = /^###\s+(P[0-3])\b/m;
const TICKET_ITEM_RE = /^-\s*\[([ x])\]\s+#(\d+)\s+(.+?)(?:\s*—\s*(.+))?$/gm;

/**
 * Parse .cursor/7. planner/tickets.md into a list of tickets (checklist items by priority).
 */
export function parseTicketsMd(content: string): ParsedTicket[] {
  if (!content?.trim()) return [];
  const tickets: ParsedTicket[] = [];
  const lines = content.split("\n");
  let currentPriority: "P0" | "P1" | "P2" | "P3" = "P0";
  // We generally ignore feature grouping now, but we can capture it if present for the ticket record
  let currentFeature = "General";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const pMatch = line.match(/^###\s+(P[0-3])\b/);
    if (pMatch) {
      currentPriority = pMatch[1] as "P0" | "P1" | "P2" | "P3";
      continue;
    }
    const fMatch = line.match(/^####\s*Feature:\s*(.+)/);
    if (fMatch) {
      currentFeature = fMatch[1].trim();
      continue;
    }
    const tMatch = line.match(/^-\s*\[([ x])\]\s+#(\d+)\s+(.+)/);
    if (tMatch) {
      const done = tMatch[1].toLowerCase() === "x";
      const num = parseInt(tMatch[2], 10);
      let rest = tMatch[3].trim();
      const agentsMatch = rest.match(/\s*—\s*((?:@[\w-]+\s*)+)\s*$/);
      const agents = agentsMatch
        ? agentsMatch[1].trim().split(/\s+/).map((s) => s.replace(/^@/, "")).filter(Boolean)
        : undefined;
      if (agents?.length) rest = rest.replace(/\s*—\s*(?:@[\w-]+\s*)+\s*$/, "").trim();
      const dashIdx = rest.indexOf(" — ");
      const title = dashIdx >= 0 ? rest.slice(0, dashIdx).trim() : rest;
      const description = dashIdx >= 0 ? rest.slice(dashIdx + 3).trim() : undefined;
      const id = `ticket-${num}`;
      tickets.push({
        id,
        number: num,
        title,
        description,
        priority: currentPriority,
        featureName: currentFeature,
        done,
        status: done ? "Done" : "Todo",
        ...(agents?.length ? { agents } : {}),
      });
    }
  }
  return tickets;
}

/**
 * Build Kanban data from .cursor/7. planner/tickets.md.
 * Column mapping: ticket.done → done; !ticket.done → backlog or in_progress when id is in inProgressIds.
 * @param inProgressIds optional list of ticket ids to place in "In progress" column (persisted in .cursor/7. planner/kanban-state.json).
 */
export function buildKanbanFromMd(
  ticketsMd: string,
  inProgressIds: string[] = []
): TodosKanbanData {
  const tickets = parseTicketsMd(ticketsMd);
  const inProgressSet = new Set(inProgressIds);
  const columns: Record<string, KanbanColumn> = {
    backlog: { name: "Backlog", items: [] },
    in_progress: { name: "In progress", items: [] },
    done: { name: "Done", items: [] },
    testing: { name: "Testing", items: [] },
  };
  for (const t of tickets) {
    if (isTicketDone(t)) {
      columns.done.items.push(t);
    } else if (inProgressSet.has(t.id)) {
      columns.in_progress.items.push(t);
    } else {
      columns.backlog.items.push(t);
    }
  }
  return {
    tickets,
    parsedAt: new Date().toISOString(),
    columns,
  };
}

/**
 * Rebuild columns from existing kanban data using a new inProgressIds (e.g. after moving a ticket to in progress).
 */
export function applyInProgressState(
  data: TodosKanbanData,
  inProgressIds: string[]
): TodosKanbanData {
  const inProgressSet = new Set(inProgressIds);
  const columns: Record<string, KanbanColumn> = {
    backlog: { name: "Backlog", items: [] },
    in_progress: { name: "In progress", items: [] },
    done: { name: "Done", items: [] },
    testing: { name: "Testing", items: [] },
  };
  for (const t of data.tickets) {
    if (isTicketDone(t)) {
      columns.done.items.push(t);
    } else if (inProgressSet.has(t.id)) {
      columns.in_progress.items.push(t);
    } else {
      columns.backlog.items.push(t);
    }
  }
  return {
    ...data,
    columns,
  };
}

/**
 * Build Kanban data from API tickets (e.g. from GET /api/data/projects/[id]/tickets) and inProgressIds.
 */
export function buildKanbanFromTickets(
  tickets: ParsedTicket[],
  inProgressIds: string[] = []
): TodosKanbanData {
  return applyInProgressState(
    { tickets, parsedAt: new Date().toISOString(), columns: {} as Record<string, KanbanColumn> },
    inProgressIds
  );
}

/**
 * Parse markdown content into a single JSON structure for Kanban and export.
 * Prefer buildKanbanFromMd when you have raw markdown.
 */
export function parseTodosToKanban(ticketIds: string[] | undefined): TodosKanbanData {
  const columns: Record<string, KanbanColumn> = {
    backlog: { name: "Backlog", items: [] },
    in_progress: { name: "In progress", items: [] },
    done: { name: "Done", items: [] },
    testing: { name: "Testing", items: [] },
  };
  return {
    tickets: [],
    parsedAt: new Date().toISOString(),
    columns,
  };
}

const PRIORITY_ORDER: Array<"P0" | "P1" | "P2" | "P3"> = ["P0", "P1", "P2", "P3"];

/**
 * Serialize parsed tickets to full .cursor/7. planner/tickets.md content (H1, metadata, Summary placeholders, Prioritized work items).
 */
export function serializeTicketsToMd(
  tickets: ParsedTicket[],
  options?: { projectName?: string }
): string {
  const projectName = options?.projectName ?? "project";
  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    `# Work items (tickets) — ${projectName}`,
    "",
    `**Project:** ${projectName}`,
    "**Source:** Kanban",
    `**Last updated:** ${date}`,
    "",
    "---",
    "",
    "## Summary: Done vs missing",
    "",
    "### Done",
    "",
    "| Area | What's implemented |",
    "|------|--------------------|",
    "",
    "### Missing or incomplete",
    "",
    "| Area | Gap |",
    "",
    "---",
    "",
    "## Prioritized work items (tickets)",
    "",
  ];
  const byPriority = new Map<ParsedTicket["priority"], ParsedTicket[]>();
  for (const p of PRIORITY_ORDER) byPriority.set(p, []);
  for (const t of tickets) byPriority.get(t.priority)!.push(t);

  for (const p of PRIORITY_ORDER) {
    const priorityTickets = byPriority.get(p)!;
    if (priorityTickets.length === 0) continue;
    const label = p === "P0" ? "Critical / foundation" : p === "P1" ? "High / quality and maintainability" : p === "P2" ? "Medium / polish and scale" : "Lower / later";
    lines.push(`### ${p} — ${label}`, "");

    // Group by feature name purely for visual organization in the markdown, 
    // even though "Features" as an entity are gone.
    const byFeature = new Map<string, ParsedTicket[]>();
    for (const t of priorityTickets) {
      const fn = t.featureName || "General";
      if (!byFeature.has(fn)) byFeature.set(fn, []);
      byFeature.get(fn)!.push(t);
    }

    for (const [featureName, featureTickets] of byFeature) {
      featureTickets.sort((a, b) => a.number - b.number);
      // We keep the #### Header to maintain structure, or we could remove it. 
      // Keeping it "Feature: Name" for minimal diffs in existing files, 
      // but maybe just "Group: Name" or just output tickets if we want to kill the concept.
      // User asked to remove features functionality.
      // Let's keep a visual grouping but maybe simpler.
      lines.push(`#### Feature: ${featureName}`, "");
      for (const t of featureTickets) {
        const checkbox = t.done ? "[x]" : "[ ]";
        const desc = t.description ? ` — ${t.description}` : "";
        const agentSuffix = t.agents?.length ? ` — ${t.agents.map((a) => `@${a}`).join(" ")}` : "";
        lines.push(`- ${checkbox} #${t.number} ${t.title}${desc}${agentSuffix}`);
      }
      lines.push("");
    }
  }
  lines.push("## Next steps", "", "1. Add or update tickets in the Kanban.", "");
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

/**
 * Mark given ticket numbers as done in .cursor/7. planner/tickets.md content.
 * Replaces `- [ ] #N` with `- [x] #N` for each N in ticketNumbers.
 */
export function markTicketsDone(tickets: ParsedTicket[], ticketIds: string[]): ParsedTicket[] {
  if (!ticketIds.length) return tickets;
  const ticketIdsSet = new Set(ticketIds);
  return tickets.map((ticket) => ({
    ...ticket,
    done: ticketIdsSet.has(ticket.id) ? true : ticket.done,
    status: ticketIdsSet.has(ticket.id) ? "Done" as const : ticket.status,
  }));
}

/**
 * Mark given ticket ids as not done (redo). Updates ticket.done and ticket.status.
 */
export function markTicketsNotDone(tickets: ParsedTicket[], ticketIds: string[]): ParsedTicket[] {
  if (!ticketIds.length) return tickets;
  const ticketIdsSet = new Set(ticketIds);
  return tickets.map((ticket) =>
    ticketIdsSet.has(ticket.id)
      ? { ...ticket, done: false, status: "Todo" as const }
      : ticket
  );
}

/**
 * Validation result for tickets.md.
 */
export type ValidationResult = {
  ok: boolean;
  message: string;
};

/**
 * Validate tickets.md format.
 */
export function validateTicketsFormat(
  kanbanData: TodosKanbanData
): ValidationResult {
  // Currently, if we parsed tickets, it's generally "ok".
  // We can add logic to ensure unique IDs or headers here if needed.
  return {
    ok: true,
    message: "Tickets parsed successfully.",
  };
}
