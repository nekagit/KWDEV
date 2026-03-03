/**
 * Dual-mode fetch for project tickets and kanban state.
 * Used by ProjectTicketsTab and ProjectRunTab to avoid duplicating invoke/fetch and row mapping.
 */

import { invoke, isTauri, projectIdArgPayload } from "@/lib/tauri";
import type { ParsedTicket } from "@/lib/todos-kanban";

type TicketRow = {
  id: string;
  number: number;
  title: string;
  description?: string;
  priority: string;
  feature_name?: string;
  featureName?: string;
  done: boolean;
  status: string;
  agents?: string[];
  milestone_id?: number;
  idea_id?: number;
};

function mapRowToParsedTicket(t: TicketRow): ParsedTicket {
  return {
    id: t.id,
    number: t.number,
    title: t.title,
    description: t.description,
    priority: (t.priority as ParsedTicket["priority"]) || "P1",
    featureName: t.featureName ?? t.feature_name ?? "General",
    done: t.done,
    status: (t.status as ParsedTicket["status"]) || "Todo",
    agents: t.agents,
    milestoneId: t.milestone_id,
    ideaId: t.idea_id,
  };
}

export type FetchProjectTicketsAndKanbanResult = {
  tickets: ParsedTicket[];
  inProgressIds: string[];
};

async function fetchTicketsAndKanbanViaApi(projectId: string): Promise<{ apiTickets: TicketRow[]; inProgressIds: string[] }> {
  const [ticketsRes, stateRes] = await Promise.all([
    fetch(`/api/data/projects/${projectId}/tickets`),
    fetch(`/api/data/projects/${projectId}/kanban-state`),
  ]);
  if (!ticketsRes.ok || !stateRes.ok) {
    const err = await ticketsRes.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to load tickets");
  }
  const apiTickets = (await ticketsRes.json()) as TicketRow[];
  const state = (await stateRes.json()) as { inProgressIds: string[] };
  return { apiTickets, inProgressIds: state.inProgressIds ?? [] };
}

/**
 * Fetches project tickets and kanban state (dual-mode: Tauri invoke or fetch API).
 * If invoke is not available yet (e.g. Tauri bridge not ready), falls back to fetch.
 * Throws on error; callers handle setKanbanError and logging.
 */
export async function fetchProjectTicketsAndKanban(
  projectId: string
): Promise<FetchProjectTicketsAndKanbanResult> {
  let apiTickets: TicketRow[];
  let inProgressIds: string[];

  if (isTauri) {
    try {
      const [ticketsList, kanbanState] = await Promise.all([
        invoke<TicketRow[]>("get_project_tickets", projectIdArgPayload(projectId)),
        invoke<{ inProgressIds: string[] }>("get_project_kanban_state", projectIdArgPayload(projectId)),
      ]);
      apiTickets = ticketsList ?? [];
      inProgressIds = kanbanState?.inProgressIds ?? [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("invoke") && msg.includes("not available")) {
        const fetched = await fetchTicketsAndKanbanViaApi(projectId);
        apiTickets = fetched.apiTickets;
        inProgressIds = fetched.inProgressIds;
      } else {
        throw err;
      }
    }
  } else {
    const fetched = await fetchTicketsAndKanbanViaApi(projectId);
    apiTickets = fetched.apiTickets;
    inProgressIds = fetched.inProgressIds;
  }

  const tickets = apiTickets.map(mapRowToParsedTicket);
  return { tickets, inProgressIds };
}
