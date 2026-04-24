/**
 * SQLite database for app data: plan_tickets, milestones, ideas, implementation_log.
 * Uses data/app.db (same path as Tauri when running from repo).
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export function getDataDir(): string {
  const cwd = process.cwd();
  const inCwd = path.join(cwd, "data");
  if (fs.existsSync(inCwd) && fs.statSync(inCwd).isDirectory()) return inCwd;
  const inParent = path.join(cwd, "..", "data");
  if (fs.existsSync(inParent) && fs.statSync(inParent).isDirectory()) return inParent;
  return cwd;
}

let db: Database.Database | null = null;

function runMigrations(conn: Database.Database): void {
  conn.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS plan_tickets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'P1' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
      feature_name TEXT NOT NULL DEFAULT 'General',
      done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
      status TEXT NOT NULL DEFAULT 'Todo' CHECK (status IN ('Todo', 'Done')),
      milestone_id INTEGER NOT NULL,
      idea_id INTEGER NOT NULL,
      agents TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(project_id, number),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(milestone_id) REFERENCES milestones(id) ON DELETE RESTRICT,
      FOREIGN KEY(idea_id) REFERENCES ideas(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS plan_kanban_state (
      project_id TEXT PRIMARY KEY,
      in_progress_ids TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      content TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(project_id, slug),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('saas', 'iaas', 'paas', 'website', 'webapp', 'webshop', 'other')),
      body TEXT,
      source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('template', 'ai', 'manual')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS implementation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      ticket_number INTEGER NOT NULL,
      ticket_title TEXT NOT NULL,
      milestone_id INTEGER,
      idea_id INTEGER,
      completed_at TEXT NOT NULL,
      files_changed TEXT NOT NULL DEFAULT '[]',
      summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(milestone_id) REFERENCES milestones(id) ON DELETE SET NULL,
      FOREIGN KEY(idea_id) REFERENCES ideas(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS server_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 22,
      username TEXT NOT NULL,
      auth_type TEXT NOT NULL,
      auth_data TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      repo_path TEXT,
      run_port INTEGER,
      prompt_ids TEXT NOT NULL DEFAULT '[]',
      ticket_ids TEXT NOT NULL DEFAULT '[]',
      idea_ids TEXT NOT NULL DEFAULT '[]',
      design_ids TEXT NOT NULL DEFAULT '[]',
      architecture_ids TEXT NOT NULL DEFAULT '[]',
      entity_categories TEXT,
      spec_files TEXT,
      spec_files_tickets TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      tags TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS designs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      config TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS architectures (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'scenario',
      description TEXT NOT NULL DEFAULT '',
      practices TEXT NOT NULL DEFAULT '',
      scenarios TEXT NOT NULL DEFAULT '',
      "references" TEXT,
      anti_patterns TEXT,
      examples TEXT,
      extra_inputs TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_prompt_links (
      project_id TEXT NOT NULL,
      prompt_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (project_id, prompt_id),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_ticket_links (
      project_id TEXT NOT NULL,
      ticket_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (project_id, ticket_id),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_idea_links (
      project_id TEXT NOT NULL,
      idea_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (project_id, idea_id),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(idea_id) REFERENCES ideas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_design_links (
      project_id TEXT NOT NULL,
      design_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (project_id, design_id),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(design_id) REFERENCES designs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_architecture_links (
      project_id TEXT NOT NULL,
      architecture_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (project_id, architecture_id),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(architecture_id) REFERENCES architectures(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_plan_tickets_project_status ON plan_tickets(project_id, status);
    CREATE INDEX IF NOT EXISTS idx_plan_tickets_project_number ON plan_tickets(project_id, number);
    CREATE INDEX IF NOT EXISTS idx_milestones_project_slug ON milestones(project_id, slug);
    CREATE INDEX IF NOT EXISTS idx_ideas_project_id ON ideas(project_id, id);
    CREATE INDEX IF NOT EXISTS idx_implementation_log_project_completed ON implementation_log(project_id, completed_at DESC);
  `);
  // Migration: add status to existing implementation_log tables
  const tableInfo = conn.prepare("PRAGMA table_info(implementation_log)").all() as { name: string }[];
  if (tableInfo.length > 0 && !tableInfo.some((c) => c.name === "status")) {
    conn.exec("ALTER TABLE implementation_log ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'");
  }
  hardenPlannerModel(conn);
  backfillProjectRelationshipLinks(conn);
}

function hardenPlannerModel(conn: Database.Database): void {
  const milestoneColumns = conn.prepare("PRAGMA table_info(milestones)").all() as Array<{ name: string }>;
  const hasMilestoneIdeaId = milestoneColumns.some((c) => c.name === "idea_id");
  if (!hasMilestoneIdeaId) {
    conn.exec(`
      ALTER TABLE milestones RENAME TO milestones_old;
      CREATE TABLE milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE RESTRICT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        content TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(project_id, slug),
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
      INSERT INTO milestones (id, project_id, idea_id, name, slug, content, created_at, updated_at)
      SELECT
        m.id,
        m.project_id,
        COALESCE(
          (
            SELECT i.id
            FROM ideas i
            WHERE i.project_id = m.project_id
            ORDER BY i.id ASC
            LIMIT 1
          ),
          (
            SELECT i2.id
            FROM ideas i2
            ORDER BY i2.id ASC
            LIMIT 1
          )
        ) AS idea_id,
        m.name,
        m.slug,
        m.content,
        m.created_at,
        m.updated_at
      FROM milestones_old m
      WHERE COALESCE(
        (
          SELECT i.id
          FROM ideas i
          WHERE i.project_id = m.project_id
          ORDER BY i.id ASC
          LIMIT 1
        ),
        (
          SELECT i2.id
          FROM ideas i2
          ORDER BY i2.id ASC
          LIMIT 1
        )
      ) IS NOT NULL;
      DROP TABLE milestones_old;
      CREATE INDEX IF NOT EXISTS idx_milestones_project_slug ON milestones(project_id, slug);
    `);
  }

  const planTicketColumns = conn.prepare("PRAGMA table_info(plan_tickets)").all() as Array<{ name: string; notnull: number }>;
  const milestoneNotNull = planTicketColumns.find((c) => c.name === "milestone_id")?.notnull === 1;
  const ideaNotNull = planTicketColumns.find((c) => c.name === "idea_id")?.notnull === 1;
  if (!milestoneNotNull || !ideaNotNull) {
    conn.exec(`
      ALTER TABLE plan_tickets RENAME TO plan_tickets_old;
      CREATE TABLE plan_tickets (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        number INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT NOT NULL DEFAULT 'P1' CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
        feature_name TEXT NOT NULL DEFAULT 'General',
        done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
        status TEXT NOT NULL DEFAULT 'Todo' CHECK (status IN ('Todo', 'Done')),
        milestone_id INTEGER NOT NULL,
        idea_id INTEGER NOT NULL,
        agents TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(project_id, number),
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY(milestone_id) REFERENCES milestones(id) ON DELETE RESTRICT,
        FOREIGN KEY(idea_id) REFERENCES ideas(id) ON DELETE RESTRICT
      );
      INSERT INTO plan_tickets (
        id, project_id, number, title, description, priority, feature_name, done, status, milestone_id, idea_id, agents, created_at, updated_at
      )
      SELECT
        t.id,
        t.project_id,
        t.number,
        t.title,
        t.description,
        t.priority,
        t.feature_name,
        t.done,
        t.status,
        COALESCE(t.milestone_id, (
          SELECT m.id FROM milestones m WHERE m.project_id = t.project_id ORDER BY m.id ASC LIMIT 1
        )) AS milestone_id,
        COALESCE(t.idea_id, (
          SELECT m.idea_id FROM milestones m WHERE m.project_id = t.project_id ORDER BY m.id ASC LIMIT 1
        )) AS idea_id,
        t.agents,
        t.created_at,
        t.updated_at
      FROM plan_tickets_old t
      WHERE COALESCE(t.milestone_id, (SELECT m.id FROM milestones m WHERE m.project_id = t.project_id ORDER BY m.id ASC LIMIT 1)) IS NOT NULL
        AND COALESCE(t.idea_id, (SELECT m.idea_id FROM milestones m WHERE m.project_id = t.project_id ORDER BY m.id ASC LIMIT 1)) IS NOT NULL;
      DROP TABLE plan_tickets_old;
      CREATE INDEX IF NOT EXISTS idx_plan_tickets_project_status ON plan_tickets(project_id, status);
      CREATE INDEX IF NOT EXISTS idx_plan_tickets_project_number ON plan_tickets(project_id, number);
    `);
  }
}

function safeParseJsonArray(raw: string | null | undefined): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function backfillProjectRelationshipLinks(conn: Database.Database): void {
  const rows = conn
    .prepare("SELECT id, prompt_ids, ticket_ids, idea_ids, design_ids, architecture_ids FROM projects")
    .all() as Array<{
    id: string;
    prompt_ids: string;
    ticket_ids: string;
    idea_ids: string;
    design_ids: string;
    architecture_ids: string;
  }>;
  const now = new Date().toISOString();
  const linkPrompt = conn.prepare(
    "INSERT OR IGNORE INTO project_prompt_links (project_id, prompt_id, created_at) VALUES (?, ?, ?)"
  );
  const linkTicket = conn.prepare(
    "INSERT OR IGNORE INTO project_ticket_links (project_id, ticket_id, created_at) VALUES (?, ?, ?)"
  );
  const linkIdea = conn.prepare(
    "INSERT OR IGNORE INTO project_idea_links (project_id, idea_id, created_at) VALUES (?, ?, ?)"
  );
  const linkDesign = conn.prepare(
    "INSERT OR IGNORE INTO project_design_links (project_id, design_id, created_at) VALUES (?, ?, ?)"
  );
  const linkArchitecture = conn.prepare(
    "INSERT OR IGNORE INTO project_architecture_links (project_id, architecture_id, created_at) VALUES (?, ?, ?)"
  );
  for (const row of rows) {
    for (const promptId of safeParseJsonArray(row.prompt_ids)) {
      if (typeof promptId === "number") linkPrompt.run(row.id, promptId, now);
    }
    for (const ticketId of safeParseJsonArray(row.ticket_ids)) {
      if (typeof ticketId === "string") linkTicket.run(row.id, ticketId, now);
    }
    for (const ideaId of safeParseJsonArray(row.idea_ids)) {
      if (typeof ideaId === "number") linkIdea.run(row.id, ideaId, now);
    }
    for (const designId of safeParseJsonArray(row.design_ids)) {
      if (typeof designId === "string") linkDesign.run(row.id, designId, now);
    }
    for (const architectureId of safeParseJsonArray(row.architecture_ids)) {
      if (typeof architectureId === "string") linkArchitecture.run(row.id, architectureId, now);
    }
  }
}

export function getDb(): Database.Database {
  if (db) return db;
  const dataDir = getDataDir();
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Database: cannot create data dir at ${dataDir}: ${msg}`);
  }
  const dbPath = path.join(dataDir, "app.db");
  try {
    db = new Database(dbPath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Database: cannot open ${dbPath}: ${msg}`);
  }
  runMigrations(db);
  migrateIdeasFromJson(db, dataDir);
  migrateProjectsFromJson(db, dataDir);
  migratePromptsFromJson(db, dataDir);
  migrateTicketsFromJson(db, dataDir);
  migrateDesignsFromJson(db, dataDir);
  migrateArchitecturesFromJson(db, dataDir);
  return db;
}

export type DbIntegrityAudit = {
  orphanPlanTicketsProject: number;
  orphanPlanTicketsMilestone: number;
  orphanPlanTicketsIdea: number;
  invalidPlanTicketStatus: number;
  invalidPlanTicketPriority: number;
  invalidIdeaCategory: number;
  invalidIdeaSource: number;
  orphanMilestonesIdea: number;
  orphanIdeasWithoutMilestone: number;
  orphanIdeasWithoutTicket: number;
};

export function runDbIntegrityAudit(conn: Database.Database = getDb()): DbIntegrityAudit {
  const count = (sql: string): number => {
    const row = conn.prepare(sql).get() as { c: number };
    return row.c;
  };
  return {
    orphanPlanTicketsProject: count(
      "SELECT COUNT(*) AS c FROM plan_tickets t LEFT JOIN projects p ON p.id = t.project_id WHERE p.id IS NULL"
    ),
    orphanPlanTicketsMilestone: count(
      "SELECT COUNT(*) AS c FROM plan_tickets t LEFT JOIN milestones m ON m.id = t.milestone_id WHERE t.milestone_id IS NOT NULL AND m.id IS NULL"
    ),
    orphanPlanTicketsIdea: count(
      "SELECT COUNT(*) AS c FROM plan_tickets t LEFT JOIN ideas i ON i.id = t.idea_id WHERE t.idea_id IS NOT NULL AND i.id IS NULL"
    ),
    invalidPlanTicketStatus: count(
      "SELECT COUNT(*) AS c FROM plan_tickets WHERE status NOT IN ('Todo', 'Done')"
    ),
    invalidPlanTicketPriority: count(
      "SELECT COUNT(*) AS c FROM plan_tickets WHERE priority NOT IN ('P0', 'P1', 'P2', 'P3')"
    ),
    invalidIdeaCategory: count(
      "SELECT COUNT(*) AS c FROM ideas WHERE category NOT IN ('saas', 'iaas', 'paas', 'website', 'webapp', 'webshop', 'other')"
    ),
    invalidIdeaSource: count(
      "SELECT COUNT(*) AS c FROM ideas WHERE source NOT IN ('template', 'ai', 'manual')"
    ),
    orphanMilestonesIdea: count(
      "SELECT COUNT(*) AS c FROM milestones m LEFT JOIN ideas i ON i.id = m.idea_id WHERE i.id IS NULL"
    ),
    orphanIdeasWithoutMilestone: count(
      "SELECT COUNT(*) AS c FROM ideas i LEFT JOIN milestones m ON m.idea_id = i.id WHERE m.id IS NULL"
    ),
    orphanIdeasWithoutTicket: count(
      "SELECT COUNT(*) AS c FROM ideas i LEFT JOIN plan_tickets t ON t.idea_id = i.id WHERE t.id IS NULL"
    ),
  };
}

/** One-time: if ideas table is empty and data/ideas.json exists, import into ideas table (preserves id for project.ideaIds). */
function migrateIdeasFromJson(conn: Database.Database, dataDir: string): void {
  const ideasFile = path.join(dataDir, "ideas.json");
  if (!fs.existsSync(ideasFile)) return;
  const count = (conn.prepare("SELECT COUNT(*) AS c FROM ideas").get() as { c: number }).c;
  if (count > 0) return;
  try {
    const raw = fs.readFileSync(ideasFile, "utf-8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    const now = new Date().toISOString();
    const stmt = conn.prepare(
      `INSERT INTO ideas (id, project_id, title, description, category, body, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const row of arr) {
      if (row == null || typeof row !== "object" || typeof row.title !== "string") continue;
      const id = Number(row.id);
      if (!Number.isInteger(id) || id < 1) continue;
      const title = String(row.title ?? "").trim();
      const description = String(row.description ?? "").trim();
      const category = ["saas", "iaas", "paas", "website", "webapp", "webshop", "other"].includes(String(row.category)) ? row.category : "other";
      const source = ["template", "ai", "manual"].includes(String(row.source)) ? row.source : "manual";
      stmt.run(id, null, title, description, category, null, source, row.created_at ?? now, row.updated_at ?? now);
    }
  } catch (_) {
    // ignore migration errors
  }
}

/** One-time: if projects table is empty and data/projects.json exists, import. */
function migrateProjectsFromJson(conn: Database.Database, dataDir: string): void {
  const filePath = path.join(dataDir, "projects.json");
  if (!fs.existsSync(filePath)) return;
  const count = (conn.prepare("SELECT COUNT(*) AS c FROM projects").get() as { c: number }).c;
  if (count > 0) return;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    const stmt = conn.prepare(
      `INSERT INTO projects (id, name, description, repo_path, run_port, prompt_ids, ticket_ids, idea_ids, design_ids, architecture_ids, entity_categories, spec_files, spec_files_tickets, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const row of arr) {
      if (row == null || typeof row !== "object" || typeof row.id !== "string") continue;
      const promptIds = Array.isArray(row.promptIds) ? JSON.stringify(row.promptIds) : "[]";
      const ticketIds = Array.isArray(row.ticketIds) ? JSON.stringify(row.ticketIds) : "[]";
      const ideaIds = Array.isArray(row.ideaIds) ? JSON.stringify(row.ideaIds) : "[]";
      const designIds = Array.isArray(row.designIds) ? JSON.stringify(row.designIds) : "[]";
      const archIds = Array.isArray(row.architectureIds) ? JSON.stringify(row.architectureIds) : "[]";
      const entityCategories = row.entityCategories != null ? JSON.stringify(row.entityCategories) : null;
      const specFiles = row.specFiles != null ? JSON.stringify(row.specFiles) : null;
      const specFilesTickets = row.specFilesTickets != null ? JSON.stringify(row.specFilesTickets) : null;
      const now = new Date().toISOString();
      stmt.run(
        row.id,
        String(row.name ?? ""),
        row.description != null ? String(row.description) : null,
        row.repoPath != null ? String(row.repoPath) : null,
        row.runPort != null ? Number(row.runPort) : null,
        promptIds,
        ticketIds,
        ideaIds,
        designIds,
        archIds,
        entityCategories,
        specFiles,
        specFilesTickets,
        row.created_at ?? now,
        row.updated_at ?? now
      );
    }
  } catch (_) {
    // ignore
  }
}

/** One-time: if prompts table is empty and data/prompts-export.json exists, import. */
function migratePromptsFromJson(conn: Database.Database, dataDir: string): void {
  const filePath = path.join(dataDir, "prompts-export.json");
  if (!fs.existsSync(filePath)) return;
  const count = (conn.prepare("SELECT COUNT(*) AS c FROM prompts").get() as { c: number }).c;
  if (count > 0) return;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    const stmt = conn.prepare(
      `INSERT INTO prompts (id, title, content, category, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const now = new Date().toISOString();
    for (const row of arr) {
      if (row == null || typeof row !== "object" || typeof row.title !== "string") continue;
      const id = Number(row.id);
      if (!Number.isInteger(id) || id < 1) continue;
      stmt.run(
        id,
        String(row.title),
        typeof row.content === "string" ? row.content : "",
        row.category != null ? String(row.category) : null,
        row.tags != null ? JSON.stringify(row.tags) : null,
        row.created_at ?? now,
        row.updated_at ?? now
      );
    }
  } catch (_) {
    // ignore
  }
}

/** One-time: if tickets table is empty and data/tickets.json exists, import. */
function migrateTicketsFromJson(conn: Database.Database, dataDir: string): void {
  const filePath = path.join(dataDir, "tickets.json");
  if (!fs.existsSync(filePath)) return;
  const count = (conn.prepare("SELECT COUNT(*) AS c FROM tickets").get() as { c: number }).c;
  if (count > 0) return;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    const stmt = conn.prepare(
      `INSERT INTO tickets (id, title, description, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const now = new Date().toISOString();
    for (const row of arr) {
      if (row == null || typeof row !== "object" || typeof row.id !== "string") continue;
      stmt.run(
        row.id,
        String(row.title ?? ""),
        String(row.description ?? ""),
        String(row.status ?? "backlog"),
        Number(row.priority) || 0,
        row.created_at ?? now,
        row.updated_at ?? now
      );
    }
  } catch (_) {
    // ignore
  }
}

/** One-time: if designs table is empty and data/designs.json exists, import. */
function migrateDesignsFromJson(conn: Database.Database, dataDir: string): void {
  const filePath = path.join(dataDir, "designs.json");
  if (!fs.existsSync(filePath)) return;
  const count = (conn.prepare("SELECT COUNT(*) AS c FROM designs").get() as { c: number }).c;
  if (count > 0) return;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    const stmt = conn.prepare(
      `INSERT INTO designs (id, name, description, image_url, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const now = new Date().toISOString();
    for (const row of arr) {
      if (row == null || typeof row !== "object" || typeof row.id !== "string") continue;
      const config = row.config != null ? JSON.stringify(row.config) : null;
      stmt.run(
        row.id,
        String(row.name ?? ""),
        row.description != null ? String(row.description) : null,
        row.image_url ?? row.imageUrl ?? null,
        config,
        row.created_at ?? now,
        row.updated_at ?? now
      );
    }
  } catch (_) {
    // ignore
  }
}

/** One-time: if architectures table is empty and data/architectures.json exists, import. */
function migrateArchitecturesFromJson(conn: Database.Database, dataDir: string): void {
  const filePath = path.join(dataDir, "architectures.json");
  if (!fs.existsSync(filePath)) return;
  const count = (conn.prepare("SELECT COUNT(*) AS c FROM architectures").get() as { c: number }).c;
  if (count > 0) return;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    const stmt = conn.prepare(
      `INSERT INTO architectures (id, name, category, description, practices, scenarios, "references", anti_patterns, examples, extra_inputs, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const now = new Date().toISOString();
    for (const row of arr) {
      if (row == null || typeof row !== "object" || typeof row.id !== "string") continue;
      const extraInputs = row.extra_inputs != null ? JSON.stringify(row.extra_inputs) : null;
      stmt.run(
        row.id,
        String(row.name ?? ""),
        String(row.category ?? "scenario"),
        String(row.description ?? ""),
        String(row.practices ?? ""),
        String(row.scenarios ?? ""),
        row.references != null ? String(row.references) : null,
        row.anti_patterns != null ? String(row.anti_patterns) : null,
        row.examples != null ? String(row.examples) : null,
        extraInputs,
        row.created_at ?? now,
        row.updated_at ?? now
      );
    }
  } catch (_) {
    // ignore
  }
}

export type PlanTicketRow = {
  id: string;
  project_id: string;
  number: number;
  title: string;
  description: string | null;
  priority: string;
  feature_name: string;
  done: number;
  status: string;
  milestone_id: number;
  idea_id: number;
  agents: string | null;
  created_at: string;
  updated_at: string;
};

export type MilestoneRow = {
  id: number;
  project_id: string;
  idea_id: number;
  name: string;
  slug: string;
  content: string | null;
  created_at: string;
  updated_at: string;
};

export type IdeaRow = {
  id: number;
  project_id: string | null;
  title: string;
  description: string;
  category: string;
  body: string | null;
  source: string;
  created_at: string;
  updated_at: string;
};

export type ImplementationLogRow = {
  id: number;
  project_id: string;
  run_id: string;
  ticket_number: number;
  ticket_title: string;
  milestone_id: number | null;
  idea_id: number | null;
  completed_at: string;
  files_changed: string;
  summary: string;
  created_at: string;
  status: string;
};

export type ServerProfileRow = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: string;
  auth_data: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  repo_path: string | null;
  run_port: number | null;
  prompt_ids: string;
  ticket_ids: string;
  idea_ids: string;
  design_ids: string;
  architecture_ids: string;
  entity_categories: string | null;
  spec_files: string | null;
  spec_files_tickets: string | null;
  created_at: string;
  updated_at: string;
};

export type PromptRow = {
  id: number;
  title: string;
  content: string;
  category: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
};

export type DesignRow = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  config: string | null;
  created_at: string;
  updated_at: string;
};

export type ArchitectureRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  practices: string;
  scenarios: string;
  references: string | null;
  anti_patterns: string | null;
  examples: string | null;
  extra_inputs: string | null;
  created_at: string;
  updated_at: string;
};
