/**
 * Designs data access: read/write from DB only.
 */
import type { DesignRecord, DesignConfig } from "@/types/design";
import { getDb, type DesignRow } from "@/lib/db";

function rowToRecord(r: DesignRow): DesignRecord {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    image_url: r.image_url ?? undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
    config: r.config ? (JSON.parse(r.config) as DesignConfig) : undefined,
  };
}

export function getDesigns(): DesignRecord[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM designs ORDER BY updated_at DESC").all() as DesignRow[];
  return rows.map(rowToRecord);
}

export function getDesignById(id: string): DesignRecord | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM designs WHERE id = ?").get(id) as DesignRow | undefined;
  return row ? rowToRecord(row) : null;
}

export function createOrUpdateDesign(data: {
  id?: string;
  name: string;
  description?: string;
  image_url?: string;
  config?: DesignConfig;
}): DesignRecord {
  const db = getDb();
  const now = new Date().toISOString();
  const id = data.id ?? crypto.randomUUID();
  const name = data.name.trim();
  const description = data.description ?? null;
  const image_url = data.image_url ?? null;
  const config = data.config != null ? JSON.stringify(data.config) : null;

  const existing = db.prepare("SELECT * FROM designs WHERE id = ?").get(id) as DesignRow | undefined;
  if (existing) {
    db.prepare(
      "UPDATE designs SET name=?, description=?, image_url=?, config=?, updated_at=? WHERE id=?"
    ).run(name, description, image_url, config, now, id);
  } else {
    db.prepare(
      "INSERT INTO designs (id, name, description, image_url, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, name, description, image_url, config, now, now);
  }
  const row = db.prepare("SELECT * FROM designs WHERE id = ?").get(id) as DesignRow;
  return rowToRecord(row);
}
