//! Schema initialization and one-time migration from kv_store to projects table.

use rusqlite::{Connection, params};

use super::constants::KV_PROJECTS;

pub(super) fn init_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS kv_store (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL,
            priority INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            prompt_ids TEXT,
            project_paths TEXT
        );
        CREATE TABLE IF NOT EXISTS features (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            ticket_ids TEXT NOT NULL DEFAULT '[]',
            prompt_ids TEXT NOT NULL DEFAULT '[]',
            project_paths TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS prompts (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS designs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            image_url TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS plan_tickets (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            number INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            priority TEXT NOT NULL DEFAULT 'P1' CHECK (priority IN ('P0','P1','P2','P3')),
            feature_name TEXT NOT NULL DEFAULT 'General',
            done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0,1)),
            status TEXT NOT NULL DEFAULT 'Todo' CHECK (status IN ('Todo','Done')),
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
            updated_at TEXT NOT NULL
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
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS ideas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('saas','iaas','paas','website','webapp','webshop','other')),
            body TEXT,
            source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('template','ai','manual')),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
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
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined'))
        );
        CREATE TABLE IF NOT EXISTS project_docs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT NOT NULL,
            doc_type TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(project_id, doc_type)
        );
        CREATE TABLE IF NOT EXISTS project_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT NOT NULL,
            config_type TEXT NOT NULL,
            config_json TEXT NOT NULL DEFAULT '{}',
            analysis_content TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(project_id, config_type)
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
        CREATE TABLE IF NOT EXISTS project_prompt_links (
            project_id TEXT NOT NULL,
            prompt_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY(project_id, prompt_id)
        );
        CREATE TABLE IF NOT EXISTS project_ticket_links (
            project_id TEXT NOT NULL,
            ticket_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY(project_id, ticket_id)
        );
        CREATE TABLE IF NOT EXISTS project_idea_links (
            project_id TEXT NOT NULL,
            idea_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY(project_id, idea_id)
        );
        CREATE TABLE IF NOT EXISTS project_design_links (
            project_id TEXT NOT NULL,
            design_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY(project_id, design_id)
        );
        CREATE TABLE IF NOT EXISTS project_architecture_links (
            project_id TEXT NOT NULL,
            architecture_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY(project_id, architecture_id)
        );
        CREATE INDEX IF NOT EXISTS idx_plan_tickets_project_status ON plan_tickets(project_id, status);
        CREATE INDEX IF NOT EXISTS idx_plan_tickets_project_number ON plan_tickets(project_id, number);
        CREATE INDEX IF NOT EXISTS idx_milestones_project_slug ON milestones(project_id, slug);
        CREATE INDEX IF NOT EXISTS idx_ideas_project_id ON ideas(project_id, id);
        CREATE INDEX IF NOT EXISTS idx_implementation_log_project_completed ON implementation_log(project_id, completed_at DESC);
        ",
    )
    .map_err(|e| e.to_string())?;
    migrate_projects_from_kv_store(conn);
    Ok(())
}

/// One-time: if projects table is empty and kv_store has key "projects", migrate JSON into projects table.
fn migrate_projects_from_kv_store(conn: &Connection) {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0))
        .unwrap_or(0);
    if count > 0 {
        return;
    }
    let json: String = match conn.query_row(
        "SELECT value FROM kv_store WHERE key = ?1",
        params![KV_PROJECTS],
        |row| row.get(0),
    ) {
        Ok(v) => v,
        Err(_) => return,
    };
    let arr: Vec<serde_json::Value> = match serde_json::from_str(&json) {
        Ok(a) => a,
        Err(_) => return,
    };
    let mut stmt = match conn.prepare(
        "INSERT INTO projects (id, name, description, repo_path, run_port, prompt_ids, ticket_ids, idea_ids, design_ids, architecture_ids, entity_categories, spec_files, spec_files_tickets, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
    ) {
        Ok(s) => s,
        Err(_) => return,
    };
    let now = chrono::Utc::now().to_rfc3339();
    for row in arr {
        let obj = match row.as_object() {
            Some(o) => o,
            None => continue,
        };
        let id = match obj.get("id").and_then(|v| v.as_str()) {
            Some(s) => s.to_string(),
            None => continue,
        };
        let name = obj.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let description = obj.get("description").and_then(|v| v.as_str()).map(String::from);
        let repo_path = obj.get("repoPath").and_then(|v| v.as_str()).map(String::from);
        let run_port = obj.get("runPort").and_then(|v| v.as_u64()).map(|n| n as i32);
        let prompt_ids = obj
            .get("prompt_ids")
            .or_else(|| obj.get("promptIds"))
            .and_then(|v| serde_json::to_string(v).ok())
            .unwrap_or_else(|| "[]".to_string());
        let ticket_ids = obj
            .get("ticket_ids")
            .or_else(|| obj.get("ticketIds"))
            .and_then(|v| serde_json::to_string(v).ok())
            .unwrap_or_else(|| "[]".to_string());
        let idea_ids = obj
            .get("idea_ids")
            .or_else(|| obj.get("ideaIds"))
            .and_then(|v| serde_json::to_string(v).ok())
            .unwrap_or_else(|| "[]".to_string());
        let design_ids = obj
            .get("design_ids")
            .or_else(|| obj.get("designIds"))
            .and_then(|v| serde_json::to_string(v).ok())
            .unwrap_or_else(|| "[]".to_string());
        let architecture_ids = obj
            .get("architecture_ids")
            .or_else(|| obj.get("architectureIds"))
            .and_then(|v| serde_json::to_string(v).ok())
            .unwrap_or_else(|| "[]".to_string());
        let entity_categories = obj
            .get("entity_categories")
            .or_else(|| obj.get("entityCategories"))
            .and_then(|v| serde_json::to_string(v).ok());
        let spec_files = obj
            .get("spec_files")
            .or_else(|| obj.get("specFiles"))
            .and_then(|v| serde_json::to_string(v).ok());
        let spec_files_tickets = obj
            .get("spec_files_tickets")
            .or_else(|| obj.get("specFilesTickets"))
            .and_then(|v| serde_json::to_string(v).ok());
        let created_at = obj
            .get("created_at")
            .or_else(|| obj.get("createdAt"))
            .and_then(|v| v.as_str())
            .unwrap_or(&now)
            .to_string();
        let updated_at = obj
            .get("updated_at")
            .or_else(|| obj.get("updatedAt"))
            .and_then(|v| v.as_str())
            .unwrap_or(&now)
            .to_string();
        let _ = stmt.execute(params![
            id,
            name,
            description,
            repo_path,
            run_port,
            prompt_ids,
            ticket_ids,
            idea_ids,
            design_ids,
            architecture_ids,
            entity_categories,
            spec_files,
            spec_files_tickets,
            created_at,
            updated_at,
        ]);
    }
}
