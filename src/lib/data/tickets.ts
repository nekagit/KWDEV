/**
 * Global tickets data access (pool referenced by project.ticketIds). Read/write from DB only.
 */
import { getDb, type TicketRow } from "@/lib/db";

export interface TicketRecord {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

function rowToRecord(r: TicketRow): TicketRecord {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function getTickets(): TicketRecord[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM tickets ORDER BY updated_at DESC").all() as TicketRow[];
  return rows.map(rowToRecord);
}

export function getTicketById(id: string): TicketRecord | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as TicketRow | undefined;
  return row ? rowToRecord(row) : null;
}

export function createTicket(data: {
  id?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: number;
}): TicketRecord {
  const db = getDb();
  const now = new Date().toISOString();
  const id = data.id ?? crypto.randomUUID();
  const title = data.title.trim();
  const description = data.description ?? "";
  const status = data.status ?? "backlog";
  const priority = data.priority ?? 0;
  db.prepare(
    "INSERT INTO tickets (id, title, description, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, title, description, status, priority, now, now);
  const row = db.prepare("SELECT * FROM tickets WHERE id = ?").get(id) as TicketRow;
  return rowToRecord(row);
}
