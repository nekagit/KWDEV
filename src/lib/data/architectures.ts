/**
 * Architectures data access: read/write from DB only.
 */
import type { ArchitectureRecord } from "@/types/architecture";
import { getDb, type ArchitectureRow } from "@/lib/db";

function rowToRecord(r: ArchitectureRow): ArchitectureRecord {
  return {
    id: r.id,
    name: r.name,
    category: r.category as ArchitectureRecord["category"],
    description: r.description,
    practices: r.practices,
    scenarios: r.scenarios,
    references: r.references ?? undefined,
    anti_patterns: r.anti_patterns ?? undefined,
    examples: r.examples ?? undefined,
    extra_inputs: r.extra_inputs ? (JSON.parse(r.extra_inputs) as Record<string, string>) : undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function getArchitectures(): ArchitectureRecord[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM architectures ORDER BY updated_at DESC").all() as ArchitectureRow[];
  return rows.map(rowToRecord);
}

export function getArchitectureById(id: string): ArchitectureRecord | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM architectures WHERE id = ?").get(id) as ArchitectureRow | undefined;
  return row ? rowToRecord(row) : null;
}

export function createOrUpdateArchitecture(data: Partial<ArchitectureRecord> & { name: string; id?: string }): ArchitectureRecord {
  const db = getDb();
  const now = new Date().toISOString();
  const id = data.id ?? crypto.randomUUID();
  const name = data.name.trim();
  const category = data.category ?? "scenario";
  const description = data.description ?? "";
  const practices = data.practices ?? "";
  const scenarios = data.scenarios ?? "";
  const references = data.references ?? null;
  const anti_patterns = data.anti_patterns ?? null;
  const examples = data.examples ?? null;
  const extra_inputs = data.extra_inputs != null ? JSON.stringify(data.extra_inputs) : null;

  const existing = db.prepare("SELECT * FROM architectures WHERE id = ?").get(id) as ArchitectureRow | undefined;
  if (existing) {
    db.prepare(
      'UPDATE architectures SET name=?, category=?, description=?, practices=?, scenarios=?, "references"=?, anti_patterns=?, examples=?, extra_inputs=?, updated_at=? WHERE id=?'
    ).run(name, category, description, practices, scenarios, references, anti_patterns, examples, extra_inputs, now, id);
  } else {
    db.prepare(
      'INSERT INTO architectures (id, name, category, description, practices, scenarios, "references", anti_patterns, examples, extra_inputs, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, name, category, description, practices, scenarios, references, anti_patterns, examples, extra_inputs, now, now);
  }
  const row = db.prepare("SELECT * FROM architectures WHERE id = ?").get(id) as ArchitectureRow;
  return rowToRecord(row);
}
