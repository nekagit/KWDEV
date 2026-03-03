//! SQLite database for app data (projects, tickets, features).
//! Migrates from existing JSON files on first run.

use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

const KV_ALL_PROJECTS: &str = "all_projects";
const KV_CURSOR_PROJECTS: &str = "cursor_projects";
const KV_CURRENT_PROJECT_ID: &str = "current_project_id";
const KV_DATA_DIR: &str = "data_dir";
const KV_PROJECTS: &str = "projects";

pub fn open_db(db_path: &Path) -> Result<Connection, String> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;",
    )
    .map_err(|e| e.to_string())?;
    init_schema(&conn)?;
    Ok(conn)
}

fn init_schema(conn: &Connection) -> Result<(), String> {
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
            priority TEXT NOT NULL DEFAULT 'P1',
            feature_name TEXT NOT NULL DEFAULT 'General',
            done INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'Todo',
            milestone_id INTEGER,
            idea_id INTEGER,
            agents TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(project_id, number)
        );
        CREATE TABLE IF NOT EXISTS plan_kanban_state (
            project_id TEXT PRIMARY KEY,
            in_progress_ids TEXT NOT NULL DEFAULT '[]',
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS milestones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            content TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ideas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'other',
            body TEXT,
            source TEXT NOT NULL DEFAULT 'manual',
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
            status TEXT NOT NULL DEFAULT 'pending'
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


/// Get data directory path from DB; if missing or invalid, use fallback and persist it.
pub fn get_data_dir(conn: &Connection, fallback: &Path) -> PathBuf {
    let stored: Option<String> = conn
        .query_row(
            "SELECT value FROM kv_store WHERE key = ?1",
            params![KV_DATA_DIR],
            |row| row.get(0),
        )
        .ok();
    let path = stored
        .filter(|s| !s.is_empty())
        .map(PathBuf::from)
        .filter(|p| p.exists() && p.is_dir());
    match path {
        Some(p) => p,
        None => {
            let fallback_buf = fallback.to_path_buf();
            let value = fallback.to_string_lossy().to_string();
            let _ = conn.execute(
                "INSERT OR REPLACE INTO kv_store (key, value) VALUES (?1, ?2)",
                params![KV_DATA_DIR, value],
            );
            fallback_buf
        }
    }
}


pub fn get_all_projects(conn: &Connection) -> Result<Vec<String>, String> {
    let content: String = match conn.query_row(
        "SELECT value FROM kv_store WHERE key = ?1",
        params![KV_ALL_PROJECTS],
        |row| row.get(0),
    ) {
        Ok(v) => v,
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            return Ok(vec![]);
        }
        Err(e) => return Err(e.to_string()),
    };
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

/// Full projects list as JSON array (same shape as data/projects.json). Default "[]".
pub fn get_projects_json(conn: &Connection) -> Result<String, String> {
    let content: String = match conn.query_row(
        "SELECT value FROM kv_store WHERE key = ?1",
        params![KV_PROJECTS],
        |row| row.get(0),
    ) {
        Ok(v) => v,
        Err(rusqlite::Error::QueryReturnedNoRows) => return Ok("[]".to_string()),
        Err(e) => return Err(e.to_string()),
    };
    Ok(content)
}

pub fn save_projects_json(conn: &Connection, json: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO kv_store (key, value) VALUES (?1, ?2)",
        params![KV_PROJECTS, json],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Row from projects table (source of truth after migration from kv_store).
#[derive(Debug, Clone)]
pub struct ProjectRow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub repo_path: Option<String>,
    pub run_port: Option<i32>,
    pub prompt_ids: String,
    pub ticket_ids: String,
    pub idea_ids: String,
    pub design_ids: String,
    pub architecture_ids: String,
    pub entity_categories: Option<String>,
    pub spec_files: Option<String>,
    pub spec_files_tickets: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub fn get_projects_from_table(conn: &Connection) -> Result<Vec<ProjectRow>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, repo_path, run_port, prompt_ids, ticket_ids, idea_ids, design_ids, architecture_ids, entity_categories, spec_files, spec_files_tickets, created_at, updated_at FROM projects ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(ProjectRow {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                repo_path: row.get(3)?,
                run_port: row.get(4)?,
                prompt_ids: row.get(5)?,
                ticket_ids: row.get(6)?,
                idea_ids: row.get(7)?,
                design_ids: row.get(8)?,
                architecture_ids: row.get(9)?,
                entity_categories: row.get(10)?,
                spec_files: row.get(11)?,
                spec_files_tickets: row.get(12)?,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = vec![];
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

pub fn insert_project(conn: &Connection, row: &ProjectRow) -> Result<(), String> {
    conn.execute(
        "INSERT INTO projects (id, name, description, repo_path, run_port, prompt_ids, ticket_ids, idea_ids, design_ids, architecture_ids, entity_categories, spec_files, spec_files_tickets, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        params![
            row.id,
            row.name,
            row.description,
            row.repo_path,
            row.run_port,
            row.prompt_ids,
            row.ticket_ids,
            row.idea_ids,
            row.design_ids,
            row.architecture_ids,
            row.entity_categories,
            row.spec_files,
            row.spec_files_tickets,
            row.created_at,
            row.updated_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn update_project(conn: &Connection, id: &str, row: &ProjectRow) -> Result<(), String> {
    conn.execute(
        "UPDATE projects SET name=?2, description=?3, repo_path=?4, run_port=?5, prompt_ids=?6, ticket_ids=?7, idea_ids=?8, design_ids=?9, architecture_ids=?10, entity_categories=?11, spec_files=?12, spec_files_tickets=?13, updated_at=?14 WHERE id=?1",
        params![
            id,
            row.name,
            row.description,
            row.repo_path,
            row.run_port,
            row.prompt_ids,
            row.ticket_ids,
            row.idea_ids,
            row.design_ids,
            row.architecture_ids,
            row.entity_categories,
            row.spec_files,
            row.spec_files_tickets,
            row.updated_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_project(conn: &Connection, id: &str) -> Result<(), String> {
    let n = conn
        .execute("DELETE FROM projects WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Project not found".to_string());
    }
    Ok(())
}

/// Key-value pair for kv_store table (for Data view).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KvEntry {
    pub key: String,
    pub value: String,
}

pub fn get_kv_store_entries(conn: &Connection) -> Result<Vec<KvEntry>, String> {
    let mut stmt = conn
        .prepare("SELECT key, value FROM kv_store ORDER BY key")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(KvEntry {
                key: row.get(0)?,
                value: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = vec![];
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

pub fn get_active_projects(conn: &Connection) -> Result<Vec<String>, String> {
    let content: String = match conn.query_row(
        "SELECT value FROM kv_store WHERE key = ?1",
        params![KV_CURSOR_PROJECTS],
        |row| row.get(0),
    ) {
        Ok(v) => v,
        Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(vec![]),
        Err(e) => return Err(e.to_string()),
    };
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn save_active_projects(conn: &Connection, projects: &[String]) -> Result<(), String> {
    let content = serde_json::to_string(projects).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO kv_store (key, value) VALUES (?1, ?2)",
        params![KV_CURSOR_PROJECTS, content],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_current_project_id(conn: &Connection) -> Result<Option<String>, String> {
    let value: Option<String> = conn
        .query_row(
            "SELECT value FROM kv_store WHERE key = ?1",
            params![KV_CURRENT_PROJECT_ID],
            |row| row.get(0),
        )
        .ok();
    Ok(value.filter(|s| !s.trim().is_empty()))
}

pub fn set_current_project_id(conn: &Connection, project_id: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO kv_store (key, value) VALUES (?1, ?2)",
        params![KV_CURRENT_PROJECT_ID, project_id.trim()],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_tickets(conn: &Connection) -> Result<Vec<super::Ticket>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, status, priority, created_at, updated_at, prompt_ids, project_paths FROM tickets ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let prompt_ids: Option<String> = row.get(7)?;
            let project_paths: Option<String> = row.get(8)?;
            Ok(super::Ticket {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                status: row.get(3)?,
                priority: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                prompt_ids: prompt_ids.and_then(|s| serde_json::from_str(&s).ok()),
                project_paths: project_paths.and_then(|s| serde_json::from_str(&s).ok()),
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = vec![];
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

pub fn save_tickets(conn: &Connection, tickets: &[super::Ticket]) -> Result<(), String> {
    conn.execute("DELETE FROM tickets", []).map_err(|e| e.to_string())?;
    for t in tickets {
        let prompt_ids = t.prompt_ids.as_ref().and_then(|v| serde_json::to_string(v).ok());
        let project_paths = t.project_paths.as_ref().and_then(|v| serde_json::to_string(v).ok());
        conn.execute(
            "INSERT INTO tickets (id, title, description, status, priority, created_at, updated_at, prompt_ids, project_paths)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                t.id,
                t.title,
                t.description,
                t.status,
                t.priority,
                t.created_at,
                t.updated_at,
                prompt_ids,
                project_paths,
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn get_features(conn: &Connection) -> Result<Vec<super::Feature>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, ticket_ids, prompt_ids, project_paths, created_at, updated_at FROM features ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(super::Feature {
                id: row.get(0)?,
                title: row.get(1)?,
                ticket_ids: serde_json::from_str(row.get::<_, String>(2)?.as_str()).unwrap_or_default(),
                prompt_ids: serde_json::from_str(row.get::<_, String>(3)?.as_str()).unwrap_or_default(),
                project_paths: serde_json::from_str(row.get::<_, String>(4)?.as_str()).unwrap_or_default(),
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = vec![];
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

pub fn save_features(conn: &Connection, features: &[super::Feature]) -> Result<(), String> {
    conn.execute("DELETE FROM features", []).map_err(|e| e.to_string())?;
    for f in features {
        let ticket_ids = serde_json::to_string(&f.ticket_ids).map_err(|e| e.to_string())?;
        let prompt_ids = serde_json::to_string(&f.prompt_ids).map_err(|e| e.to_string())?;
        let project_paths = serde_json::to_string(&f.project_paths).map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO features (id, title, ticket_ids, prompt_ids, project_paths, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                f.id,
                f.title,
                ticket_ids,
                prompt_ids,
                project_paths,
                f.created_at,
                f.updated_at,
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn get_prompts(conn: &Connection) -> Result<Vec<super::Prompt>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, content, created_at, updated_at FROM prompts ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(super::Prompt {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = vec![];
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

pub fn save_prompts(conn: &Connection, prompts: &[super::Prompt]) -> Result<(), String> {
    conn.execute("DELETE FROM prompts", []).map_err(|e| e.to_string())?;
    for p in prompts {
        conn.execute(
            "INSERT INTO prompts (id, title, content, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                p.id,
                p.title,
                p.content,
                p.created_at,
                p.updated_at,
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn get_designs(conn: &Connection) -> Result<Vec<super::Design>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, image_url, created_at, updated_at FROM designs ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(super::Design {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                image_url: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = vec![];
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

pub fn save_designs(conn: &Connection, designs: &[super::Design]) -> Result<(), String> {
    conn.execute("DELETE FROM designs", []).map_err(|e| e.to_string())?;
    for d in designs {
        conn.execute(
            "INSERT INTO designs (id, name, description, image_url, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                d.id,
                d.name,
                d.description,
                d.image_url,
                d.created_at,
                d.updated_at,
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// --- Project-scoped data for Worker/Planner (avoid fetch to /api which triggers URL parse error in Tauri) ---

pub fn get_plan_tickets_for_project(conn: &Connection, project_id: &str) -> Result<Vec<serde_json::Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, number, title, description, priority, feature_name, done, status, milestone_id, idea_id, agents, created_at, updated_at FROM plan_tickets WHERE project_id = ?1 ORDER BY number ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![project_id.trim()], |row| {
            let agents: Option<String> = row.get(11)?;
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "project_id": row.get::<_, String>(1)?,
                "number": row.get::<_, i64>(2)?,
                "title": row.get::<_, String>(3)?,
                "description": row.get::<_, Option<String>>(4)?,
                "priority": row.get::<_, String>(5)?,
                "feature_name": row.get::<_, String>(6)?,
                "featureName": row.get::<_, String>(6)?,
                "done": row.get::<_, i64>(7)? != 0,
                "status": row.get::<_, String>(8)?,
                "milestone_id": row.get::<_, Option<i64>>(9)?,
                "idea_id": row.get::<_, Option<i64>>(10)?,
                "milestoneId": row.get::<_, Option<i64>>(9)?,
                "ideaId": row.get::<_, Option<i64>>(10)?,
                "agents": agents.and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok()),
                "created_at": row.get::<_, String>(12)?,
                "updated_at": row.get::<_, String>(13)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut out = vec![];
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

pub fn get_plan_kanban_state_for_project(conn: &Connection, project_id: &str) -> Result<serde_json::Value, String> {
    let in_progress_ids: String = conn
        .query_row(
            "SELECT in_progress_ids FROM plan_kanban_state WHERE project_id = ?1",
            rusqlite::params![project_id.trim()],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "[]".to_string());
    let ids: Vec<String> = serde_json::from_str(&in_progress_ids).unwrap_or_default();
    Ok(serde_json::json!({ "inProgressIds": ids }))
}

/// Create a plan ticket for a project. Returns the new ticket as JSON (same shape as API).
pub fn create_plan_ticket(
    conn: &Connection,
    project_id: &str,
    title: &str,
    description: Option<&str>,
    priority: &str,
    feature_name: &str,
    milestone_id: i64,
    idea_id: Option<i64>,
    agents: Option<&str>,
) -> Result<serde_json::Value, String> {
    let project_id = project_id.trim();
    let title = title.trim();
    if title.is_empty() {
        return Err("title is required".to_string());
    }
    let number: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(number), 0) AS n FROM plan_tickets WHERE project_id = ?1",
            rusqlite::params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    let number = number + 1;
    let id = format!("ticket-{}-{}", project_id, number);
    let now = chrono::Utc::now().to_rfc3339();
    let priority = if ["P0", "P1", "P2", "P3"].contains(&priority) {
        priority
    } else {
        "P1"
    };
    let desc = description.unwrap_or("");
    let feat = feature_name.trim().if_empty("General");
    conn.execute(
        "INSERT INTO plan_tickets (id, project_id, number, title, description, priority, feature_name, done, status, milestone_id, idea_id, agents, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, 'Todo', ?8, ?9, ?10, ?11, ?12)",
        rusqlite::params![
            id,
            project_id,
            number,
            title,
            desc,
            priority,
            feat,
            milestone_id,
            idea_id,
            agents.unwrap_or(""),
            &now,
            &now,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "id": id,
        "project_id": project_id,
        "number": number,
        "title": title,
        "description": desc,
        "priority": priority,
        "feature_name": feat,
        "featureName": feat,
        "done": false,
        "status": "Todo",
        "milestone_id": milestone_id,
        "idea_id": idea_id,
        "milestoneId": milestone_id,
        "ideaId": idea_id,
        "agents": agents.and_then(|s| serde_json::from_str::<Vec<String>>(s).ok()),
        "created_at": now,
        "updated_at": now,
    }))
}

/// Update a plan ticket's done and status (for Worker tab Mark done/Redo; avoids fetch in Tauri).
pub fn update_plan_ticket(
    conn: &Connection,
    project_id: &str,
    ticket_id: &str,
    done: bool,
    status: &str,
) -> Result<(), String> {
    let project_id = project_id.trim();
    let ticket_id = ticket_id.trim();
    let status = match status {
        "Done" | "Todo" => status,
        _ => return Err("status must be 'Done' or 'Todo'".to_string()),
    };
    let done_int = if done { 1 } else { 0 };
    let now = chrono::Utc::now().to_rfc3339();
    let updated = conn
        .execute(
            "UPDATE plan_tickets SET done = ?1, status = ?2, updated_at = ?3 WHERE id = ?4 AND project_id = ?5",
            rusqlite::params![done_int, status, &now, ticket_id, project_id],
        )
        .map_err(|e| e.to_string())?;
    if updated == 0 {
        return Err("Ticket not found".to_string());
    }
    Ok(())
}

/// Delete a plan ticket (for Worker tab Archive; avoids fetch in Tauri).
pub fn delete_plan_ticket(
    conn: &Connection,
    project_id: &str,
    ticket_id: &str,
) -> Result<(), String> {
    let project_id = project_id.trim();
    let ticket_id = ticket_id.trim();
    let updated = conn
        .execute("DELETE FROM plan_tickets WHERE id = ?1 AND project_id = ?2", rusqlite::params![ticket_id, project_id])
        .map_err(|e| e.to_string())?;
    if updated == 0 {
        return Err("Ticket not found".to_string());
    }
    Ok(())
}

trait IfEmpty {
    fn if_empty<'a>(&'a self, default: &'a str) -> &'a str;
}
impl IfEmpty for str {
    fn if_empty<'a>(&'a self, default: &'a str) -> &'a str {
        if self.trim().is_empty() {
            default
        } else {
            self
        }
    }
}

/// Set in-progress IDs for a project's kanban state (upsert).
pub fn set_plan_kanban_state_for_project(
    conn: &Connection,
    project_id: &str,
    in_progress_ids: &[String],
) -> Result<(), String> {
    let project_id = project_id.trim();
    let now = chrono::Utc::now().to_rfc3339();
    let ids_json = serde_json::to_string(in_progress_ids).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO plan_kanban_state (project_id, in_progress_ids, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(project_id) DO UPDATE SET in_progress_ids = excluded.in_progress_ids, updated_at = excluded.updated_at",
        rusqlite::params![project_id, ids_json, &now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

const GENERAL_DEVELOPMENT_NAME: &str = "General Development";
const GENERAL_DEVELOPMENT_SLUG: &str = "general-development";

pub fn get_milestones_for_project(conn: &Connection, project_id: &str) -> Result<Vec<serde_json::Value>, String> {
    let project_id = project_id.trim();
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, name, slug, content, created_at, updated_at FROM milestones WHERE project_id = ?1 ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![project_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, i64>(0)?,
                "project_id": row.get::<_, String>(1)?,
                "name": row.get::<_, String>(2)?,
                "slug": row.get::<_, String>(3)?,
                "content": row.get::<_, Option<String>>(4)?,
                "created_at": row.get::<_, String>(5)?,
                "updated_at": row.get::<_, String>(6)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut out = vec![];
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    let has_general = out.iter().any(|v| v.get("name").and_then(|n| n.as_str()) == Some(GENERAL_DEVELOPMENT_NAME));
    if !has_general {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO milestones (project_id, name, slug, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![project_id, GENERAL_DEVELOPMENT_NAME, GENERAL_DEVELOPMENT_SLUG, None::<String>, &now, &now],
        )
        .map_err(|e| e.to_string())?;
        let mut stmt2 = conn
            .prepare(
                "SELECT id, project_id, name, slug, content, created_at, updated_at FROM milestones WHERE project_id = ?1 ORDER BY name ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows2 = stmt2
            .query_map(rusqlite::params![project_id], |row| {
                Ok(serde_json::json!({
                    "id": row.get::<_, i64>(0)?,
                    "project_id": row.get::<_, String>(1)?,
                    "name": row.get::<_, String>(2)?,
                    "slug": row.get::<_, String>(3)?,
                    "content": row.get::<_, Option<String>>(4)?,
                    "created_at": row.get::<_, String>(5)?,
                    "updated_at": row.get::<_, String>(6)?,
                }))
            })
            .map_err(|e| e.to_string())?;
        out = vec![];
        for row in rows2 {
            out.push(row.map_err(|e| e.to_string())?);
        }
    }
    Ok(out)
}

/// Create one idea and return the new row. Used by Idea-driven "create from description" flow.
pub fn create_idea(
    conn: &Connection,
    project_id: Option<&str>,
    title: &str,
    description: &str,
    category: &str,
    source: &str,
) -> Result<serde_json::Value, String> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO ideas (project_id, title, description, category, body, source, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7)",
        rusqlite::params![
            project_id,
            title.trim(),
            description.trim(),
            if category.is_empty() { "other" } else { category },
            if source.is_empty() { "manual" } else { source },
            &now,
            &now,
        ],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let (project_id_out, title_out, description_out, category_out, source_out, created_at, updated_at): (
        Option<String>, String, String, String, String, String, String,
    ) = conn
        .query_row(
            "SELECT project_id, title, description, category, source, created_at, updated_at FROM ideas WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                ))
            },
        )
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "id": id,
        "project_id": project_id_out,
        "title": title_out,
        "description": description_out,
        "category": category_out,
        "source": source_out,
        "created_at": created_at,
        "updated_at": updated_at,
    }))
}

/// Delete an idea by id.
pub fn delete_idea(conn: &Connection, idea_id: i64) -> Result<(), String> {
    let affected = conn
        .execute("DELETE FROM ideas WHERE id = ?1", rusqlite::params![idea_id])
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("Idea not found".to_string());
    }
    Ok(())
}

/// Create one milestone for a project and return the new row. Used by Idea-driven "create from description" flow.
pub fn create_milestone(
    conn: &Connection,
    project_id: &str,
    name: &str,
    slug: &str,
    content: Option<&str>,
) -> Result<serde_json::Value, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let slug_use: String = if slug.trim().is_empty() {
        name.trim()
            .to_lowercase()
            .chars()
            .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
            .collect::<String>()
            .trim_matches('-')
            .to_string()
    } else {
        slug.trim().to_string()
    };
    let slug_use = if slug_use.is_empty() { "milestone".to_string() } else { slug_use };
    conn.execute(
        "INSERT INTO milestones (project_id, name, slug, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            project_id.trim(),
            name.trim(),
            slug_use,
            content.unwrap_or("").trim(),
            &now,
            &now,
        ],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let (project_id_out, name_out, slug_out, content_out, created_at, updated_at): (
        String, String, String, Option<String>, String, String,
    ) = conn
        .query_row(
            "SELECT project_id, name, slug, content, created_at, updated_at FROM milestones WHERE id = ?1",
            rusqlite::params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?)),
        )
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "id": id,
        "project_id": project_id_out,
        "name": name_out,
        "slug": slug_out,
        "content": content_out,
        "created_at": created_at,
        "updated_at": updated_at,
    }))
}

/// Delete a milestone by id and project_id.
pub fn delete_milestone(conn: &Connection, project_id: &str, milestone_id: i64) -> Result<(), String> {
    let affected = conn
        .execute(
            "DELETE FROM milestones WHERE id = ?1 AND project_id = ?2",
            rusqlite::params![milestone_id, project_id.trim()],
        )
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("Milestone not found".to_string());
    }
    Ok(())
}

pub fn get_ideas_list(conn: &Connection, project_id: Option<&str>) -> Result<Vec<serde_json::Value>, String> {
    let mut out = vec![];
    let map_row = |row: &rusqlite::Row| {
        Ok(serde_json::json!({
            "id": row.get::<_, i64>(0)?,
            "project_id": row.get::<_, Option<String>>(1)?,
            "title": row.get::<_, String>(2)?,
            "description": row.get::<_, String>(3)?,
            "category": row.get::<_, String>(4)?,
            "source": row.get::<_, String>(5)?,
            "created_at": row.get::<_, String>(6)?,
            "updated_at": row.get::<_, String>(7)?,
        }))
    };
    if let Some(pid) = project_id {
        let mut stmt = conn
            .prepare("SELECT id, project_id, title, description, category, source, created_at, updated_at FROM ideas WHERE project_id = ?1 OR project_id IS NULL ORDER BY id ASC")
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map(rusqlite::params![pid.trim()], map_row).map_err(|e| e.to_string())?;
        for row in rows {
            out.push(row.map_err(|e| e.to_string())?);
        }
    } else {
        let mut stmt = conn
            .prepare("SELECT id, project_id, title, description, category, source, created_at, updated_at FROM ideas ORDER BY id ASC")
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], map_row).map_err(|e| e.to_string())?;
        for row in rows {
            out.push(row.map_err(|e| e.to_string())?);
        }
    }
    Ok(out)
}

// --- Project Documents (ideas, design, architecture, testing, documentation, project_info) ---

/// Valid doc_type values for project_docs table.
pub const PROJECT_DOC_TYPES: &[&str] = &["ideas", "design", "architecture", "testing", "documentation", "project_info"];

/// Get a project document by type. Returns content or empty string if not found.
pub fn get_project_doc(conn: &Connection, project_id: &str, doc_type: &str) -> Result<String, String> {
    let project_id = project_id.trim();
    let doc_type = doc_type.trim();
    if !PROJECT_DOC_TYPES.contains(&doc_type) {
        return Err(format!("Invalid doc_type: {}. Must be one of: {:?}", doc_type, PROJECT_DOC_TYPES));
    }
    let content: String = conn
        .query_row(
            "SELECT content FROM project_docs WHERE project_id = ?1 AND doc_type = ?2",
            rusqlite::params![project_id, doc_type],
            |row| row.get(0),
        )
        .unwrap_or_default();
    Ok(content)
}

/// Set a project document content (upsert).
pub fn set_project_doc(conn: &Connection, project_id: &str, doc_type: &str, content: &str) -> Result<(), String> {
    let project_id = project_id.trim();
    let doc_type = doc_type.trim();
    if !PROJECT_DOC_TYPES.contains(&doc_type) {
        return Err(format!("Invalid doc_type: {}. Must be one of: {:?}", doc_type, PROJECT_DOC_TYPES));
    }
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO project_docs (project_id, doc_type, content, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(project_id, doc_type) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at",
        rusqlite::params![project_id, doc_type, content, &now, &now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Get all project documents for a project.
pub fn get_all_project_docs(conn: &Connection, project_id: &str) -> Result<serde_json::Value, String> {
    let project_id = project_id.trim();
    let mut stmt = conn
        .prepare("SELECT doc_type, content, created_at, updated_at FROM project_docs WHERE project_id = ?1")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![project_id], |row| {
            Ok(serde_json::json!({
                "doc_type": row.get::<_, String>(0)?,
                "content": row.get::<_, String>(1)?,
                "created_at": row.get::<_, String>(2)?,
                "updated_at": row.get::<_, String>(3)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut out = vec![];
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(serde_json::json!(out))
}

// --- Project Configs (frontend, backend) ---

/// Valid config_type values for project_configs table.
pub const PROJECT_CONFIG_TYPES: &[&str] = &["frontend", "backend"];

/// Get a project config by type. Returns JSON object or empty object if not found.
pub fn get_project_config(conn: &Connection, project_id: &str, config_type: &str) -> Result<serde_json::Value, String> {
    let project_id = project_id.trim();
    let config_type = config_type.trim();
    if !PROJECT_CONFIG_TYPES.contains(&config_type) {
        return Err(format!("Invalid config_type: {}. Must be one of: {:?}", config_type, PROJECT_CONFIG_TYPES));
    }
    let result: Option<(String, Option<String>)> = conn
        .query_row(
            "SELECT config_json, analysis_content FROM project_configs WHERE project_id = ?1 AND config_type = ?2",
            rusqlite::params![project_id, config_type],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .ok();
    match result {
        Some((config_json, analysis_content)) => {
            let config: serde_json::Value = serde_json::from_str(&config_json).unwrap_or(serde_json::json!({}));
            Ok(serde_json::json!({
                "config": config,
                "analysis": analysis_content,
            }))
        }
        None => Ok(serde_json::json!({
            "config": {},
            "analysis": null,
        })),
    }
}

/// Set a project config (upsert). config_json should be a valid JSON string.
pub fn set_project_config(
    conn: &Connection,
    project_id: &str,
    config_type: &str,
    config_json: &str,
    analysis_content: Option<&str>,
) -> Result<(), String> {
    let project_id = project_id.trim();
    let config_type = config_type.trim();
    if !PROJECT_CONFIG_TYPES.contains(&config_type) {
        return Err(format!("Invalid config_type: {}. Must be one of: {:?}", config_type, PROJECT_CONFIG_TYPES));
    }
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO project_configs (project_id, config_type, config_json, analysis_content, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(project_id, config_type) DO UPDATE SET config_json = excluded.config_json, analysis_content = excluded.analysis_content, updated_at = excluded.updated_at",
        rusqlite::params![project_id, config_type, config_json, analysis_content, &now, &now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

/// Get all project configs for a project.
pub fn get_all_project_configs(conn: &Connection, project_id: &str) -> Result<serde_json::Value, String> {
    let project_id = project_id.trim();
    let mut stmt = conn
        .prepare("SELECT config_type, config_json, analysis_content, created_at, updated_at FROM project_configs WHERE project_id = ?1")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![project_id], |row| {
            let config_json: String = row.get(1)?;
            let config: serde_json::Value = serde_json::from_str(&config_json).unwrap_or(serde_json::json!({}));
            Ok(serde_json::json!({
                "config_type": row.get::<_, String>(0)?,
                "config": config,
                "analysis": row.get::<_, Option<String>>(2)?,
                "created_at": row.get::<_, String>(3)?,
                "updated_at": row.get::<_, String>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut out = vec![];
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    Ok(serde_json::json!(out))
}
