//! Projects table and kv_store keys for project list, active projects, current project, data dir.

use rusqlite::{Connection, params};
use std::path::{Path, PathBuf};
use std::fs::OpenOptions;
use std::io::Write;

use super::constants::{
    KV_CURSOR_PROJECTS, KV_CURRENT_PROJECT_ID, KV_DATA_DIR, KV_PROJECTS,
};

// #region agent log
const DEBUG_LOG_PATH: &str = "/Users/nenadkalicanin/Documents/KW/Products/KWDEV/.cursor/debug-8b7cf9.log";
fn debug_agent_log(location: &str, message: &str, data: &[(&str, &str)]) {
    let data_pairs: Vec<String> = data
        .iter()
        .map(|(k, v)| {
            let v_esc = v.replace('\\', "\\\\").replace('"', "\\\"");
            format!("\"{}\":\"{}\"", k, v_esc)
        })
        .collect();
    let data_str = data_pairs.join(",");
    let line = format!(
        "{{\"sessionId\":\"8b7cf9\",\"location\":\"{}\",\"message\":\"{}\",\"data\":{{{}}},\"timestamp\":{}}}\n",
        location.replace('\\', "\\\\").replace('"', "\\\""),
        message.replace('\\', "\\\\").replace('"', "\\\""),
        data_str,
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis()
    );
    let _ = OpenOptions::new().create(true).append(true).open(DEBUG_LOG_PATH).and_then(|mut f| f.write_all(line.as_bytes()));
}
// #endregion

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

/// Read id from row; SQLite may store as TEXT or INTEGER (legacy), so we accept both.
fn get_id_string(row: &rusqlite::Row, idx: usize) -> rusqlite::Result<String> {
    row.get::<_, String>(idx)
        .or_else(|_| row.get::<_, i64>(idx).map(|n| n.to_string()))
}

/// Read run_port from row; SQLite may store as INTEGER or TEXT (legacy), so we accept both.
fn get_run_port(row: &rusqlite::Row, idx: usize) -> rusqlite::Result<Option<i32>> {
    if let Ok(Some(n)) = row.get::<_, Option<i64>>(idx) {
        if n >= 0 && n <= i32::MAX as i64 {
            return Ok(Some(n as i32));
        }
    }
    if let Ok(Some(s)) = row.get::<_, Option<String>>(idx) {
        if let Ok(n) = s.trim().parse::<i32>() {
            if n >= 0 && n <= 65535 {
                return Ok(Some(n));
            }
        }
    }
    Ok(None)
}

pub fn get_projects_from_table(conn: &Connection) -> Result<Vec<ProjectRow>, String> {
    // #region agent log
    debug_agent_log(
        "db/projects.rs:get_projects_from_table",
        "start",
        &[("hypothesisId", "H1")],
    );
    // #endregion
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, repo_path, run_port, prompt_ids, ticket_ids, idea_ids, design_ids, architecture_ids, entity_categories, spec_files, spec_files_tickets, created_at, updated_at FROM projects ORDER BY updated_at DESC",
        )
        .map_err(|e| {
            let msg = e.to_string();
            debug_agent_log("db/projects.rs:get_projects_from_table", "prepare_failed", &[("hypothesisId", "H5"), ("err", &msg)]);
            msg
        })?;
    let col_names = ["id", "name", "description", "repo_path", "run_port", "prompt_ids", "ticket_ids", "idea_ids", "design_ids", "architecture_ids", "entity_categories", "spec_files", "spec_files_tickets", "created_at", "updated_at"];
    let rows = stmt
        .query_map([], |row| {
            let id: String = get_id_string(&row, 0).map_err(|e| {
                let msg = e.to_string();
                debug_agent_log("db/projects.rs:get_projects_from_table", "col_failed", &[("hypothesisId", "H1"), ("col", "0"), ("name", col_names[0]), ("err", &msg)]);
                e
            })?;
            let name: String = row.get(1).map_err(|e| {
                let msg = e.to_string();
                debug_agent_log("db/projects.rs:get_projects_from_table", "col_failed", &[("hypothesisId", "H1"), ("col", "1"), ("name", col_names[1]), ("err", &msg)]);
                e
            })?;
            let description: Option<String> = row.get(2).map_err(|e| {
                let msg = e.to_string();
                debug_agent_log("db/projects.rs:get_projects_from_table", "col_failed", &[("hypothesisId", "H1"), ("col", "2"), ("name", col_names[2]), ("err", &msg)]);
                e
            })?;
            let repo_path: Option<String> = row.get(3).map_err(|e| {
                let msg = e.to_string();
                debug_agent_log("db/projects.rs:get_projects_from_table", "col_failed", &[("hypothesisId", "H1"), ("col", "3"), ("name", col_names[3]), ("err", &msg)]);
                e
            })?;
            let run_port: Option<i32> = get_run_port(&row, 4).map_err(|e| {
                let msg = e.to_string();
                debug_agent_log("db/projects.rs:get_projects_from_table", "col_failed", &[("hypothesisId", "H1"), ("col", "4"), ("name", col_names[4]), ("err", &msg)]);
                e
            })?;
            let prompt_ids: String = row.get(5).map_err(|e| {
                let msg = e.to_string();
                debug_agent_log("db/projects.rs:get_projects_from_table", "col_failed", &[("hypothesisId", "H1"), ("col", "5"), ("name", col_names[5]), ("err", &msg)]);
                e
            })?;
            let ticket_ids: String = row.get(6).map_err(|e| {
                let msg = e.to_string();
                debug_agent_log("db/projects.rs:get_projects_from_table", "col_failed", &[("hypothesisId", "H1"), ("col", "6"), ("name", col_names[6]), ("err", &msg)]);
                e
            })?;
            let idea_ids: String = row.get(7).map_err(|e| {
                let msg = e.to_string();
                debug_agent_log("db/projects.rs:get_projects_from_table", "col_failed", &[("hypothesisId", "H1"), ("col", "7"), ("name", col_names[7]), ("err", &msg)]);
                e
            })?;
            let design_ids: String = row.get(8).map_err(|e| {
                let msg = e.to_string();
                debug_agent_log("db/projects.rs:get_projects_from_table", "col_failed", &[("hypothesisId", "H1"), ("col", "8"), ("name", col_names[8]), ("err", &msg)]);
                e
            })?;
            let architecture_ids: String = row.get(9).map_err(|e| {
                let msg = e.to_string();
                debug_agent_log("db/projects.rs:get_projects_from_table", "col_failed", &[("hypothesisId", "H1"), ("col", "9"), ("name", col_names[9]), ("err", &msg)]);
                e
            })?;
            let entity_categories: Option<String> = row.get(10).map_err(|e| {
                let msg = e.to_string();
                debug_agent_log("db/projects.rs:get_projects_from_table", "col_failed", &[("hypothesisId", "H1"), ("col", "10"), ("name", col_names[10]), ("err", &msg)]);
                e
            })?;
            let spec_files: Option<String> = row.get(11).map_err(|e| {
                let msg = e.to_string();
                debug_agent_log("db/projects.rs:get_projects_from_table", "col_failed", &[("hypothesisId", "H1"), ("col", "11"), ("name", col_names[11]), ("err", &msg)]);
                e
            })?;
            let spec_files_tickets: Option<String> = row.get(12).map_err(|e| {
                let msg = e.to_string();
                debug_agent_log("db/projects.rs:get_projects_from_table", "col_failed", &[("hypothesisId", "H1"), ("col", "12"), ("name", col_names[12]), ("err", &msg)]);
                e
            })?;
            let created_at: String = row.get(13).map_err(|e| {
                let msg = e.to_string();
                debug_agent_log("db/projects.rs:get_projects_from_table", "col_failed", &[("hypothesisId", "H1"), ("col", "13"), ("name", col_names[13]), ("err", &msg)]);
                e
            })?;
            let updated_at: String = row.get(14).map_err(|e| {
                let msg = e.to_string();
                debug_agent_log("db/projects.rs:get_projects_from_table", "col_failed", &[("hypothesisId", "H1"), ("col", "14"), ("name", col_names[14]), ("err", &msg)]);
                e
            })?;
            Ok(ProjectRow {
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
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = vec![];
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    // #region agent log
    debug_agent_log("db/projects.rs:get_projects_from_table", "ok", &[("hypothesisId", "H1"), ("row_count", &out.len().to_string())]);
    // #endregion
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
