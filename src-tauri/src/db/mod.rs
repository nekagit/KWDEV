//! SQLite database for app data (projects, tickets, features).
//! Migrates from existing JSON files on first run.

mod constants;
mod docs_configs;
mod legacy;
mod milestones_ideas;
mod plan;
mod projects;
mod schema;

pub use docs_configs::{
    get_all_project_configs, get_all_project_docs, get_project_config, get_project_doc,
    set_project_config, set_project_doc,
};
pub use legacy::{
    get_designs, get_features, get_prompts, get_tickets, save_designs, save_features, save_prompts,
    save_tickets,
};
pub use milestones_ideas::{
    create_idea, create_milestone, delete_idea, delete_milestone, get_ideas_list,
    get_milestones_for_project, run_integrity_audit_for_project,
};
pub use plan::{
    create_plan_ticket, delete_plan_ticket, get_plan_kanban_state_for_project,
    get_plan_tickets_for_project, set_plan_kanban_state_for_project, update_plan_ticket,
};
pub use projects::{
    delete_project, get_active_projects, get_all_projects, get_current_project_id,
    get_data_dir, get_projects_from_table, get_projects_json, insert_project, save_active_projects,
    save_projects_json, set_current_project_id, update_project, ProjectRow,
};
mod kv;
pub use kv::{get_kv_store_entries, KvEntry};

use rusqlite::Connection;
use std::path::Path;

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
    schema::init_schema(&conn)?;
    Ok(conn)
}
