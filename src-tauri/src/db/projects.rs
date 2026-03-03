//! Projects table and kv_store keys for project list, active projects, current project, data dir.

use rusqlite::{Connection, params};
use std::path::{Path, PathBuf};

use super::constants::{
    KV_CURSOR_PROJECTS, KV_CURRENT_PROJECT_ID, KV_DATA_DIR, KV_PROJECTS,
};

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
        params![super::constants::KV_ALL_PROJECTS],
        |row| row.get(0),
    ) {
        Ok(v) => v,
        Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(vec![]),
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
