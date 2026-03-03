//! Tauri app entry and commands: run scripts, SQLite, project/ticket CRUD. Invoked from the frontend via invoke().

mod db;

use base64::Engine;
use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::io::{BufRead, BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Emitter, Manager, State};
#[cfg(debug_assertions)]
use url::Url;
use url::Url as ParseUrl;

#[cfg(unix)]
use std::os::unix::process::CommandExt;

struct RunEntry {
    child: Child,
    label: String,
}

struct RunningState {
    runs: Arc<Mutex<HashMap<String, RunEntry>>>,
}

impl Default for RunningState {
    fn default() -> Self {
        Self {
            runs: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunIdResponse {
    pub run_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptLogPayload {
    pub run_id: String,
    pub line: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptExitedPayload {
    pub run_id: String,
    pub label: String,
    /// Exit code of the script process when available (e.g. 0 = success, non-zero = failure).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunningRunInfo {
    pub run_id: String,
    pub label: String,
}

// #region agent log
fn debug_log(location: &str, message: &str, data: &[(&str, &str)]) {
    let data_obj: std::collections::HashMap<String, String> = data.iter().map(|(k, v)| ((*k).to_string(), (*v).to_string())).collect();
    let payload = serde_json::json!({
        "timestamp": SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis(),
        "location": location,
        "message": message,
        "data": data_obj,
        "hypothesisId": "A"
    });
    if let Ok(line) = serde_json::to_string(&payload) {
        let _ = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open("/Users/nenadkalicanin/Documents/February/KW-February-KWCode/.cursor/debug.log")
            .and_then(|mut f| std::io::Write::write_all(&mut f, format!("{}\n", line).as_bytes()));
    }
}

#[cfg(debug_assertions)]
const DEBUG_SESSION_LOG: &str = "/Users/nenadkalicanin/Documents/February/KW-February-KWCode/.cursor/debug-b2093c.log";
#[cfg(debug_assertions)]
fn session_log(location: &str, message: &str, data: &[(&str, &str)], hypothesis_id: &str) {
    let data_obj: std::collections::HashMap<String, String> = data.iter().map(|(k, v)| ((*k).to_string(), (*v).to_string())).collect();
    let payload = serde_json::json!({
        "sessionId": "b2093c",
        "timestamp": SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis(),
        "location": location,
        "message": message,
        "data": data_obj,
        "hypothesisId": hypothesis_id
    });
    if let Ok(line) = serde_json::to_string(&payload) {
        let _ = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(DEBUG_SESSION_LOG)
            .and_then(|mut f| std::io::Write::write_all(&mut f, format!("{}\n", line).as_bytes()));
    }
}
// #region agent log (session c29a12)
const DEBUG_LOG_C29A12: &str = "/Users/nenadkalicanin/Documents/February/KW-February-KWCode/.cursor/debug-c29a12.log";
fn session_log_c29a12(location: &str, message: &str, data: &[(&str, &str)], hypothesis_id: &str) {
    let data_obj: std::collections::HashMap<String, String> = data.iter().map(|(k, v)| ((*k).to_string(), (*v).to_string())).collect();
    let payload = serde_json::json!({
        "sessionId": "c29a12",
        "timestamp": SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis(),
        "location": location,
        "message": message,
        "data": data_obj,
        "hypothesisId": hypothesis_id
    });
    if let Ok(line) = serde_json::to_string(&payload) {
        let _ = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(DEBUG_LOG_C29A12)
            .and_then(|mut f| std::io::Write::write_all(&mut f, format!("{}\n", line).as_bytes()));
    }
}
// #endregion
// #region agent log (session 8a3da1)
#[cfg(debug_assertions)]
const DEBUG_LOG_8A3DA1: &str = "/Users/nenadkalicanin/Documents/February/KW-February-KWCode/.cursor/debug-8a3da1.log";
#[cfg(debug_assertions)]
fn session_log_8a3da1(location: &str, message: &str, data: &[(&str, &str)], hypothesis_id: &str) {
    let data_obj: std::collections::HashMap<String, String> = data.iter().map(|(k, v)| ((*k).to_string(), (*v).to_string())).collect();
    let payload = serde_json::json!({
        "sessionId": "8a3da1",
        "timestamp": SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis(),
        "location": location,
        "message": message,
        "data": data_obj,
        "hypothesisId": hypothesis_id
    });
    if let Ok(line) = serde_json::to_string(&payload) {
        let _ = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(DEBUG_LOG_8A3DA1)
            .and_then(|mut f| std::io::Write::write_all(&mut f, format!("{}\n", line).as_bytes()));
    }
}
// #endregion
// #region agent log (session 415745)
const DEBUG_LOG_415745: &str = "/Users/nenadkalicanin/Documents/February/KW-February-KWCode/.cursor/debug-415745.log";
fn session_log_415745(location: &str, message: &str, data: &[(&str, &str)], hypothesis_id: &str) {
    let data_obj: std::collections::HashMap<String, String> = data.iter().map(|(k, v)| ((*k).to_string(), (*v).to_string())).collect();
    let payload = serde_json::json!({
        "sessionId": "415745",
        "timestamp": SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis(),
        "location": location,
        "message": message,
        "data": data_obj,
        "hypothesisId": hypothesis_id
    });
    if let Ok(line) = serde_json::to_string(&payload) {
        let _ = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(DEBUG_LOG_415745)
            .and_then(|mut f| std::io::Write::write_all(&mut f, format!("{}\n", line).as_bytes()));
    }
}
// #endregion

/// Returns true when the app is built for Windows. Used to branch script paths and spawn
/// logic (shell, args) in subsequent tickets. Compile-time via `cfg!(target_os = "windows")`.
fn is_windows() -> bool {
    cfg!(target_os = "windows")
}

fn gen_run_id() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("run-{}", nanos)
}

// Helper to generate current ISO 8601 timestamp
fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn get_seed_prompts() -> Vec<Prompt> {
    let now = now_iso();
    vec![
        Prompt {
            id: "prompt-1".to_string(),
            title: "Initial Project Setup".to_string(),
            content: "Generate a basic project structure for a Next.js application with Tailwind CSS and TypeScript.".to_string(),
            created_at: now.clone(),
            updated_at: now.clone(),
        },
        Prompt {
            id: "prompt-2".to_string(),
            title: "Create User Authentication Flow".to_string(),
            content: "Implement a complete user authentication flow including signup, login, and password reset functionalities.".to_string(),
            created_at: now.clone(),
            updated_at: now.clone(),
        },
    ]
}

fn get_seed_designs() -> Vec<Design> {
    let now = now_iso();
    vec![
        Design {
            id: "design-1".to_string(),
            name: "Dashboard Layout".to_string(),
            description: Some("Responsive dashboard layout with a sidebar navigation and a main content area.".to_string()),
            image_url: Some("https://example.com/dashboard-layout.png".to_string()),
            created_at: now.clone(),
            updated_at: now.clone(),
        },
        Design {
            id: "design-2".to_string(),
            name: "User Profile Page".to_string(),
            description: Some("Clean and modern user profile page displaying user information, settings, and activity feed.".to_string()),
            image_url: Some("https://example.com/user-profile.png".to_string()),
            created_at: now.clone(),
            updated_at: now.clone(),
        },
    ]
}

fn seed_initial_data(conn: &rusqlite::Connection) -> Result<(), String> {
    // Seed Prompts
    let prompts_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM prompts",
        [],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    if prompts_count == 0 {
        println!("Seeding initial prompts...");
        db::save_prompts(conn, &get_seed_prompts())?;
    }

    // Seed Designs
    let designs_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM designs",
        [],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    if designs_count == 0 {
        println!("Seeding initial designs...");
        db::save_designs(conn, &get_seed_designs())?;
    }

    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ticket {
    pub id: String,
    pub title: String,
    pub description: String,
    pub status: String, // "backlog" | "in_progress" | "done" | "blocked"
    #[serde(default)]
    pub priority: i32,
    pub created_at: String,
    pub updated_at: String,
    // Legacy: read for migration, never serialized
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_ids: Option<Vec<u32>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub project_paths: Option<Vec<String>>,
}

/// A milestone that has to be done in an application. One feature has many tickets and must have at least one.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Feature {
    pub id: String,
    pub title: String, // label for run / display
    /// At least one ticket; a feature groups work items (tickets) for this milestone.
    #[serde(default)]
    pub ticket_ids: Vec<String>,
    #[serde(default)]
    pub prompt_ids: Vec<u32>,
    #[serde(default)]
    pub project_paths: Vec<String>, // empty = use active projects
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Prompt {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Design {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub image_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunScriptArgs {
    #[serde(default)]
    pub prompt_ids: Vec<u32>,
    #[serde(default)]
    pub combined_prompt: Option<String>,
    #[serde(default)]
    pub active_projects: Vec<String>,
    pub timing: TimingParams,
    pub run_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimingParams {
    pub sleep_after_open_project: f64,
    pub sleep_after_window_focus: f64,
    pub sleep_between_shift_tabs: f64,
    pub sleep_after_all_shift_tabs: f64,
    pub sleep_after_cmd_n: f64,
    pub sleep_before_paste: f64,
    pub sleep_after_paste: f64,
    pub sleep_after_enter: f64,
    pub sleep_between_projects: f64,
    pub sleep_between_rounds: f64,
}

/// Git repository info for the project details Git tab.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GitInfo {
    pub current_branch: String,
    pub branches: Vec<String>,
    pub remotes: String,
    pub status_short: String,
    pub last_commits: Vec<String>,
    pub head_ref: String,
    pub config_preview: String,
}

fn run_git(project_path: &PathBuf, args: &[&str]) -> Result<String, String> {
    let out = Command::new("git")
        .args(args)
        .current_dir(project_path)
        .output()
        .map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
    if out.status.success() {
        Ok(stdout)
    } else {
        Err(if stderr.is_empty() { stdout } else { stderr })
    }
}

#[tauri::command]
fn get_git_info(project_path: String) -> Result<GitInfo, String> {
    let path_buf = PathBuf::from(project_path.trim());
    if path_buf.as_os_str().is_empty() {
        return Err("Project path is empty".to_string());
    }
    if !path_buf.exists() || !path_buf.is_dir() {
        return Err("Project path does not exist or is not a directory".to_string());
    }
    let git_dir = path_buf.join(".git");
    if !git_dir.exists() {
        return Err("Not a git repository (no .git)".to_string());
    }

    let mut info = GitInfo::default();

    // HEAD ref (e.g. ref: refs/heads/main)
    let head_path = git_dir.join("HEAD");
    if head_path.is_file() {
        info.head_ref = std::fs::read_to_string(&head_path).unwrap_or_default().trim().to_string();
        if info.head_ref.starts_with("ref: ") {
            info.current_branch = info.head_ref.trim_start_matches("ref: refs/heads/").to_string();
        }
    }

    // git status -sb
    if let Ok(s) = run_git(&path_buf, &["status", "-sb"]) {
        info.status_short = s;
    }

    // git branch -a
    if let Ok(s) = run_git(&path_buf, &["branch", "-a"]) {
        info.branches = s.lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()).collect();
    }

    // git remote -v
    if let Ok(s) = run_git(&path_buf, &["remote", "-v"]) {
        info.remotes = s;
    }

    // git log -n 30 --oneline
    if let Ok(s) = run_git(&path_buf, &["log", "-n", "30", "--oneline"]) {
        info.last_commits = s.lines().map(|l| l.to_string()).filter(|l| !l.is_empty()).collect();
    }

    // .git/config preview (first 4KB, sanitized)
    let config_path = git_dir.join("config");
    if config_path.is_file() {
        if let Ok(content) = std::fs::read_to_string(&config_path) {
            let max_len = 4096;
            info.config_preview = if content.len() > max_len {
                format!("{}...", &content[..max_len])
            } else {
                content
            };
        }
    }

    Ok(info)
}

#[tauri::command]
fn get_git_head(project_path: String) -> Result<String, String> {
    let path_buf = PathBuf::from(project_path.trim());
    if path_buf.as_os_str().is_empty() || !path_buf.exists() || !path_buf.is_dir() {
        return Ok(String::new());
    }
    let git_dir = path_buf.join(".git");
    if !git_dir.exists() {
        return Ok(String::new());
    }
    Ok(run_git(&path_buf, &["rev-parse", "HEAD"]).unwrap_or_default())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitDiffNameStatusEntry {
    pub path: String,
    pub status: String,
}

#[tauri::command]
fn get_git_diff_name_status(project_path: String, from_ref: String) -> Result<Vec<GitDiffNameStatusEntry>, String> {
    let path_buf = PathBuf::from(project_path.trim());
    if !path_buf.exists() || !path_buf.is_dir() {
        return Err("Project path does not exist".to_string());
    }
    if !path_buf.join(".git").exists() {
        return Ok(Vec::new());
    }
    let ref_arg = if from_ref.trim().is_empty() { "HEAD" } else { from_ref.trim() };
    let out = run_git(&path_buf, &["diff", "--name-status", ref_arg, "--", "."]);
    let stdout = match out {
        Ok(s) => s,
        Err(_) => return Ok(Vec::new()),
    };
    let mut entries = Vec::new();
    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let mut it = line.splitn(2, '\t');
        let status = it.next().unwrap_or("").to_string();
        let path = it.next().unwrap_or("").to_string();
        if !path.is_empty() {
            entries.push(GitDiffNameStatusEntry { path, status });
        }
    }
    Ok(entries)
}

#[derive(serde::Serialize)]
pub struct ImplementationLogEntry {
    pub id: i64,
    pub project_id: String,
    pub run_id: String,
    pub ticket_number: i64,
    pub ticket_title: String,
    pub milestone_id: Option<i64>,
    pub idea_id: Option<i64>,
    pub completed_at: String,
    pub files_changed: String,
    pub summary: String,
    pub created_at: String,
    pub status: String,
}

#[tauri::command]
fn get_implementation_log_entries(ProjectIdArg { project_id }: ProjectIdArg) -> Result<Vec<ImplementationLogEntry>, String> {
    with_db(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, run_id, ticket_number, ticket_title, milestone_id, idea_id, completed_at, files_changed, summary, created_at, status FROM implementation_log WHERE project_id = ?1 ORDER BY completed_at DESC, id DESC",
        )
        .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(rusqlite::params![project_id.trim()], |row| {
                Ok(ImplementationLogEntry {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    run_id: row.get(2)?,
                    ticket_number: row.get(3)?,
                    ticket_title: row.get(4)?,
                    milestone_id: row.get(5)?,
                    idea_id: row.get(6)?,
                    completed_at: row.get(7)?,
                    files_changed: row.get(8)?,
                    summary: row.get(9)?,
                    created_at: row.get(10)?,
                    status: row.get::<_, String>(11).unwrap_or_else(|_| "pending".to_string()),
                })
            })
            .map_err(|e| e.to_string())?;
        let entries: Vec<ImplementationLogEntry> = rows
            .filter_map(|r| r.ok())
            .collect();
        Ok(entries)
    })
}

/// Args for project-scoped commands; accept camelCase projectId from frontend.
#[derive(serde::Deserialize)]
struct ProjectIdArg {
    #[serde(alias = "projectId")]
    project_id: String,
}

#[derive(serde::Deserialize)]
struct ProjectIdArgOptional {
    #[serde(alias = "projectId", default)]
    project_id: Option<String>,
}

/// Project-scoped tickets (plan_tickets). Used when isTauri to avoid fetch to /api which triggers URL parse error.
#[tauri::command]
fn get_project_tickets(ProjectIdArg { project_id }: ProjectIdArg) -> Result<Vec<serde_json::Value>, String> {
    with_db(|conn| db::get_plan_tickets_for_project(conn, &project_id))
}

/// Project kanban state (inProgressIds). Used when isTauri to avoid fetch to /api.
#[tauri::command]
fn get_project_kanban_state(ProjectIdArg { project_id }: ProjectIdArg) -> Result<serde_json::Value, String> {
    with_db(|conn| db::get_plan_kanban_state_for_project(conn, &project_id))
}

/// Project milestones. Used when isTauri to avoid fetch to /api.
#[tauri::command]
fn get_project_milestones(ProjectIdArg { project_id }: ProjectIdArg) -> Result<Vec<serde_json::Value>, String> {
    with_db(|conn| db::get_milestones_for_project(conn, &project_id))
}

/// Args for create_plan_ticket; accept camelCase from frontend. In built app, IPC expects payload key `args`.
#[derive(serde::Deserialize)]
struct CreatePlanTicketArgs {
    #[serde(alias = "projectId")]
    project_id: String,
    title: String,
    description: Option<String>,
    priority: Option<String>,
    #[serde(alias = "featureName")]
    feature_name: Option<String>,
    #[serde(alias = "milestoneId")]
    milestone_id: i64,
    #[serde(alias = "ideaId")]
    idea_id: Option<i64>,
    agents: Option<String>,
}

/// Create a plan ticket (for Fast development in Tauri mode; avoids fetch to /api).
#[tauri::command]
fn create_plan_ticket(args: CreatePlanTicketArgs) -> Result<serde_json::Value, String> {
    with_db(|conn| {
        db::create_plan_ticket(
            conn,
            &args.project_id,
            &args.title,
            args.description.as_deref(),
            args.priority.as_deref().unwrap_or("P1"),
            args.feature_name.as_deref().unwrap_or("General"),
            args.milestone_id,
            args.idea_id,
            args.agents.as_deref(),
        )
    })
}

/// Args for set_plan_kanban_state; accept camelCase from frontend. In built app, IPC expects payload key `args`.
#[derive(serde::Deserialize)]
struct SetPlanKanbanStateArgs {
    #[serde(alias = "projectId")]
    project_id: String,
    #[serde(alias = "inProgressIds")]
    in_progress_ids: Vec<String>,
}

/// Set plan kanban in-progress IDs (for Fast development in Tauri mode; avoids fetch to /api).
#[tauri::command]
fn set_plan_kanban_state(args: SetPlanKanbanStateArgs) -> Result<(), String> {
    with_db(|conn| db::set_plan_kanban_state_for_project(conn, &args.project_id, &args.in_progress_ids))
}

/// Update a plan ticket's done and status (for Worker tab Mark done/Redo; avoids fetch in Tauri).
#[tauri::command]
fn update_plan_ticket(
    project_id: String,
    ticket_id: String,
    done: bool,
    status: String,
) -> Result<(), String> {
    with_db(|conn| db::update_plan_ticket(conn, &project_id, &ticket_id, done, status.trim()))
}

/// Delete a plan ticket (for Worker tab Archive; avoids fetch in Tauri).
#[tauri::command]
fn delete_plan_ticket(project_id: String, ticket_id: String) -> Result<(), String> {
    with_db(|conn| db::delete_plan_ticket(conn, &project_id, &ticket_id))
}

/// Ideas list (optional project filter). Used when isTauri to avoid fetch to /api.
#[tauri::command]
fn get_ideas_list(ProjectIdArgOptional { project_id }: ProjectIdArgOptional) -> Result<Vec<serde_json::Value>, String> {
    with_db(|conn| db::get_ideas_list(conn, project_id.as_deref()))
}

#[derive(serde::Deserialize)]
struct CreateIdeaArgs {
    #[serde(alias = "projectId")]
    project_id: Option<String>,
    title: String,
    description: Option<String>,
    category: Option<String>,
    source: Option<String>,
}

/// Create one idea (for Idea-driven "create from description" flow). Returns the new idea row.
#[tauri::command]
fn create_idea(args: CreateIdeaArgs) -> Result<serde_json::Value, String> {
    // #region agent log
    let log_payload = serde_json::json!({"sessionId":"6152ec","location":"lib.rs:create_idea:entry","message":"create_idea called","data":{"project_id":&args.project_id,"title":&args.title,"desc_len":args.description.as_ref().map(|s|s.len()).unwrap_or(0),"category":&args.category,"source":&args.source},"timestamp":std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis(),"hypothesisId":"H1,H3"});
    let _ = std::fs::OpenOptions::new().create(true).append(true).open("/Users/nenadkalicanin/Documents/February/KW-February-KWCode/.cursor/debug-6152ec.log").and_then(|mut f| std::io::Write::write_all(&mut f, format!("{}\n", log_payload).as_bytes()));
    // #endregion
    let result = with_db(|conn| {
        db::create_idea(
            conn,
            args.project_id.as_deref(),
            args.title.trim(),
            args.description.as_deref().unwrap_or("").trim(),
            args.category.as_deref().unwrap_or("other").trim(),
            args.source.as_deref().unwrap_or("manual").trim(),
        )
    });
    // #region agent log
    match &result {
        Ok(v) => {
            let log_payload = serde_json::json!({"sessionId":"6152ec","location":"lib.rs:create_idea:success","message":"create_idea succeeded","data":{"idea":v},"timestamp":std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis(),"hypothesisId":"H2,H4"});
            let _ = std::fs::OpenOptions::new().create(true).append(true).open("/Users/nenadkalicanin/Documents/February/KW-February-KWCode/.cursor/debug-6152ec.log").and_then(|mut f| std::io::Write::write_all(&mut f, format!("{}\n", log_payload).as_bytes()));
        }
        Err(e) => {
            let log_payload = serde_json::json!({"sessionId":"6152ec","location":"lib.rs:create_idea:error","message":"create_idea failed","data":{"error":e},"timestamp":std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis(),"hypothesisId":"H2,H4"});
            let _ = std::fs::OpenOptions::new().create(true).append(true).open("/Users/nenadkalicanin/Documents/February/KW-February-KWCode/.cursor/debug-6152ec.log").and_then(|mut f| std::io::Write::write_all(&mut f, format!("{}\n", log_payload).as_bytes()));
        }
    }
    // #endregion
    result
}

#[derive(serde::Deserialize)]
struct DeleteIdeaArgs {
    #[serde(alias = "ideaId")]
    idea_id: i64,
}

/// Delete an idea by id.
#[tauri::command]
fn delete_idea(args: DeleteIdeaArgs) -> Result<(), String> {
    with_db(|conn| db::delete_idea(conn, args.idea_id))
}

#[derive(serde::Deserialize)]
struct ImproveIdeaForProjectArgs {
    #[serde(alias = "projectId")]
    project_id: String,
    #[serde(alias = "rawTitle")]
    raw_title: String,
    #[serde(alias = "rawDescription")]
    raw_description: String,
}

#[derive(serde::Serialize)]
struct ImproveIdeaResult {
    #[serde(rename = "improvedTitle")]
    improved_title: String,
    #[serde(rename = "improvedDescription")]
    improved_description: String,
}

fn build_idea_upgrade_prompt(
    raw_title: &str,
    raw_description: &str,
    project_name: &str,
    project_description: Option<&str>,
    ideas: &[serde_json::Value],
    milestones: &[serde_json::Value],
    tickets: &[serde_json::Value],
) -> String {
    let desc_block = project_description
        .and_then(|s| Some(s.trim()))
        .filter(|s| !s.is_empty())
        .unwrap_or("(none)");
    let ideas_block = if ideas.is_empty() {
        "(none)".to_string()
    } else {
        ideas
            .iter()
            .filter_map(|v| {
                let title = v.get("title")?.as_str()?.to_string();
                let desc = v.get("description").and_then(|d| d.as_str()).unwrap_or("").trim();
                let suffix: String = desc.chars().take(120).collect();
                Some(if suffix.is_empty() { format!("- {}", title) } else { format!("- {} — {}", title, suffix) })
            })
            .collect::<Vec<_>>()
            .join("\n")
    };
    let milestones_block = if milestones.is_empty() {
        "(none)".to_string()
    } else {
        milestones
            .iter()
            .filter_map(|v| {
                let name = v.get("name")?.as_str()?.to_string();
                let content = v.get("content").and_then(|c| c.as_str()).unwrap_or("").trim();
                let suffix: String = content.chars().take(120).collect();
                Some(if suffix.is_empty() { format!("- {}", name) } else { format!("- {} — {}", name, suffix) })
            })
            .collect::<Vec<_>>()
            .join("\n")
    };
    let tickets_block = if tickets.is_empty() {
        "(none)".to_string()
    } else {
        tickets
            .iter()
            .filter_map(|v| {
                let title = v.get("title")?.as_str()?.to_string();
                let desc = v.get("description").and_then(|d| d.as_str()).unwrap_or("").trim();
                let suffix: String = desc.chars().take(120).collect();
                Some(if suffix.is_empty() { format!("- {}", title) } else { format!("- {} — {}", title, suffix) })
            })
            .collect::<Vec<_>>()
            .join("\n")
    };
    let raw_desc = raw_description.trim();
    let raw_desc_display = if raw_desc.is_empty() { "(no description)" } else { raw_desc };

    format!(
        r#"You are tailoring a product/feature idea to an existing project. Use the project's current state below. Output in the same language as the user's input.

Project: {}
Description: {}

Existing ideas (title and optional short description):
{}

Milestones (name and optional content):
{}

Recent tickets (title and optional short description):
{}

User's raw idea —
Title: {}
Description: {}

Output exactly:
- First line: improved idea title (one line, no markdown, no heading).
- Then one blank line.
- Then the improved description in markdown (2–4 sentences or bullets). No extra preamble or explanation."#,
        project_name,
        desc_block,
        ideas_block,
        milestones_block,
        tickets_block,
        raw_title,
        raw_desc_display
    )
}

fn parse_idea_upgrade_output(raw_output: &str, fallback_title: &str) -> ImproveIdeaResult {
    let trimmed = raw_output.trim();
    if trimmed.is_empty() {
        return ImproveIdeaResult {
            improved_title: fallback_title.to_string(),
            improved_description: String::new(),
        };
    }
    let lines: Vec<&str> = trimmed.lines().collect();
    let first_line = lines.first().map(|s| s.trim()).unwrap_or("");
    let mut desc_start = 1;
    while desc_start < lines.len() && lines[desc_start].trim().is_empty() {
        desc_start += 1;
    }
    let description_lines = &lines[desc_start..];
    let improved_description = description_lines.join("\n").trim().to_string();
    let improved_title = if first_line.is_empty() {
        fallback_title.to_string()
    } else {
        first_line.to_string()
    };
    ImproveIdeaResult {
        improved_title,
        improved_description,
    }
}

/// Tailor a raw idea to the project's current state using the agent CLI. Returns improved title and description.
#[tauri::command]
fn improve_idea_for_project(args: ImproveIdeaForProjectArgs) -> Result<ImproveIdeaResult, String> {
    let project_id = args.project_id.trim();
    let raw_title = args.raw_title.trim();
    let raw_description = args.raw_description.trim();
    let fallback_title = if raw_title.is_empty() { "Untitled idea" } else { raw_title };

    let project = with_db(|conn| {
        let projects = list_projects_impl(conn)?;
        projects.into_iter().find(|p| p.id == project_id).ok_or_else(|| "Project not found".to_string())
    })?;

    let ideas = with_db(|conn| db::get_ideas_list(conn, Some(project_id))).unwrap_or_default();
    let milestones = with_db(|conn| db::get_milestones_for_project(conn, project_id)).unwrap_or_default();
    let tickets = with_db(|conn| db::get_plan_tickets_for_project(conn, project_id)).unwrap_or_default();
    let tickets_limited: Vec<serde_json::Value> = tickets.into_iter().take(50).collect();

    let prompt = build_idea_upgrade_prompt(
        raw_title,
        raw_description,
        &project.name,
        project.description.as_deref(),
        &ideas,
        &milestones,
        &tickets_limited,
    );

    let tmp_dir = std::env::temp_dir();
    let tmp_path = tmp_dir.join(format!("kw_agent_prompt_{}_{}.txt", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis(), uuid::Uuid::new_v4()));
    std::fs::write(&tmp_path, &prompt).map_err(|e| format!("Failed to write prompt temp file: {}", e))?;

    let work_dir = project
        .repo_path
        .as_ref()
        .and_then(|p| {
            let path = PathBuf::from(p.trim());
            if path.exists() && path.is_dir() {
                Some(path)
            } else {
                None
            }
        })
        .or_else(|| std::env::current_dir().ok())
        .unwrap_or_else(|| PathBuf::from("."));

    let agent_cli = std::env::var("AGENT_CLI_PATH").unwrap_or_else(|_| "agent".to_string()).trim().to_string();
    let agent_cli = if agent_cli.is_empty() { "agent".to_string() } else { agent_cli };

    let output = Command::new("bash")
        .arg("-c")
        .arg(format!(r#"TMPFILE="{}" AGENT_CLI="{}" "$AGENT_CLI" --trust -p "$(cat "$TMPFILE")""#, tmp_path.display(), agent_cli))
        .current_dir(&work_dir)
        .output()
        .map_err(|e| e.to_string())?;

    let _ = std::fs::remove_file(&tmp_path);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            format!("Agent exited with code {}", output.status.code().unwrap_or(-1))
        } else {
            stderr
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(parse_idea_upgrade_output(&stdout, fallback_title))
}

#[derive(serde::Deserialize)]
struct CreateProjectMilestoneArgs {
    #[serde(alias = "projectId")]
    project_id: String,
    name: String,
    slug: Option<String>,
    content: Option<String>,
}

/// Create one milestone for a project (for Idea-driven "create from description" flow). Returns the new milestone row.
#[tauri::command]
fn create_project_milestone(args: CreateProjectMilestoneArgs) -> Result<serde_json::Value, String> {
    with_db(|conn| {
        db::create_milestone(
            conn,
            args.project_id.trim(),
            args.name.trim(),
            args.slug.as_deref().unwrap_or("").trim(),
            args.content.as_deref(),
        )
    })
}

#[derive(serde::Deserialize)]
struct DeleteProjectMilestoneArgs {
    #[serde(alias = "projectId")]
    project_id: String,
    #[serde(alias = "milestoneId")]
    milestone_id: i64,
}

/// Delete a milestone by project_id and milestone_id.
#[tauri::command]
fn delete_project_milestone(args: DeleteProjectMilestoneArgs) -> Result<(), String> {
    with_db(|conn| db::delete_milestone(conn, &args.project_id, args.milestone_id))
}

// --- Project Documents and Configs ---

#[derive(serde::Deserialize)]
struct GetProjectDocArgs {
    #[serde(alias = "projectId")]
    project_id: String,
    #[serde(alias = "docType")]
    doc_type: String,
}

/// Get a project document by type (ideas, design, architecture, testing, documentation, project_info).
#[tauri::command]
fn get_project_doc(args: GetProjectDocArgs) -> Result<String, String> {
    with_db(|conn| db::get_project_doc(conn, &args.project_id, &args.doc_type))
}

#[derive(serde::Deserialize)]
struct SetProjectDocArgs {
    #[serde(alias = "projectId")]
    project_id: String,
    #[serde(alias = "docType")]
    doc_type: String,
    content: String,
}

/// Set a project document content (upsert).
#[tauri::command]
fn set_project_doc(args: SetProjectDocArgs) -> Result<(), String> {
    with_db(|conn| db::set_project_doc(conn, &args.project_id, &args.doc_type, &args.content))
}

/// Get all project documents for a project.
#[tauri::command]
fn get_all_project_docs(ProjectIdArg { project_id }: ProjectIdArg) -> Result<serde_json::Value, String> {
    with_db(|conn| db::get_all_project_docs(conn, &project_id))
}

#[derive(serde::Deserialize)]
struct GetProjectConfigArgs {
    #[serde(alias = "projectId")]
    project_id: String,
    #[serde(alias = "configType")]
    config_type: String,
}

/// Get a project config by type (frontend, backend).
#[tauri::command]
fn get_project_config(args: GetProjectConfigArgs) -> Result<serde_json::Value, String> {
    with_db(|conn| db::get_project_config(conn, &args.project_id, &args.config_type))
}

#[derive(serde::Deserialize)]
struct SetProjectConfigArgs {
    #[serde(alias = "projectId")]
    project_id: String,
    #[serde(alias = "configType")]
    config_type: String,
    #[serde(alias = "configJson")]
    config_json: String,
    #[serde(alias = "analysisContent")]
    analysis_content: Option<String>,
}

/// Set a project config (upsert).
#[tauri::command]
fn set_project_config(args: SetProjectConfigArgs) -> Result<(), String> {
    with_db(|conn| db::set_project_config(
        conn,
        &args.project_id,
        &args.config_type,
        &args.config_json,
        args.analysis_content.as_deref(),
    ))
}

/// Get all project configs for a project.
#[tauri::command]
fn get_all_project_configs(ProjectIdArg { project_id }: ProjectIdArg) -> Result<serde_json::Value, String> {
    with_db(|conn| db::get_all_project_configs(conn, &project_id))
}

// --- KV Store (for migration tracking and general settings) ---

/// Get a value from kv_store by key.
#[tauri::command]
fn get_kv_value(key: String) -> Result<Option<String>, String> {
    with_db(|conn| {
        let result: Option<String> = conn
            .query_row(
                "SELECT value FROM kv_store WHERE key = ?1",
                rusqlite::params![key.trim()],
                |row| row.get(0),
            )
            .ok();
        Ok(result)
    })
}

/// Set a value in kv_store (upsert).
#[tauri::command]
fn set_kv_value(key: String, value: String) -> Result<(), String> {
    with_db(|conn| {
        conn.execute(
            "INSERT OR REPLACE INTO kv_store (key, value) VALUES (?1, ?2)",
            rusqlite::params![key.trim(), value],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[tauri::command]
fn update_implementation_log_entry_status(
    project_id: String,
    entry_id: i64,
    status: String,
) -> Result<ImplementationLogEntry, String> {
    let status = status.trim();
    if status != "accepted" && status != "declined" {
        return Err("status must be 'accepted' or 'declined'".to_string());
    }
    with_db(|conn| {
        let updated = conn
            .execute(
                "UPDATE implementation_log SET status = ?1 WHERE id = ?2 AND project_id = ?3",
                rusqlite::params![status, entry_id, project_id.trim()],
            )
            .map_err(|e| e.to_string())?;
        if updated == 0 {
            return Err("Implementation log entry not found".to_string());
        }
        let entry = conn.query_row(
            "SELECT id, project_id, run_id, ticket_number, ticket_title, milestone_id, idea_id, completed_at, files_changed, summary, created_at, status FROM implementation_log WHERE id = ?1",
            rusqlite::params![entry_id],
            |row| {
                Ok(ImplementationLogEntry {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    run_id: row.get(2)?,
                    ticket_number: row.get(3)?,
                    ticket_title: row.get(4)?,
                    milestone_id: row.get(5)?,
                    idea_id: row.get(6)?,
                    completed_at: row.get(7)?,
                    files_changed: row.get(8)?,
                    summary: row.get(9)?,
                    created_at: row.get(10)?,
                    status: row.get::<_, String>(11).unwrap_or_else(|_| "pending".to_string()),
                })
            },
        )
        .map_err(|e| e.to_string())?;
        Ok(entry)
    })
}

#[tauri::command]
fn append_implementation_log_entry(
    project_id: String,
    run_id: String,
    ticket_number: i64,
    ticket_title: String,
    milestone_id: Option<i64>,
    idea_id: Option<i64>,
    completed_at: String,
    files_changed: String,
    summary: String,
) -> Result<(), String> {
    with_db(|conn| {
        conn.execute(
            "INSERT INTO implementation_log (project_id, run_id, ticket_number, ticket_title, milestone_id, idea_id, completed_at, files_changed, summary, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                project_id.trim(),
                run_id.trim(),
                ticket_number,
                ticket_title.trim(),
                milestone_id,
                idea_id,
                completed_at.trim(),
                if files_changed.trim().is_empty() { "[]" } else { files_changed.trim() },
                summary.trim(),
                now_iso(),
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
}

/// Return git diff and full file content for a changed file. Used when clicking a file in the Git tab.
#[derive(serde::Serialize)]
pub struct GitFileView {
    pub diff: String,
    pub full_content: Option<String>,
}

#[tauri::command]
fn get_git_file_view(project_path: String, file_path: String) -> Result<GitFileView, String> {
    let path_buf = PathBuf::from(project_path.trim());
    if !path_buf.exists() || !path_buf.is_dir() {
        return Err("Project path does not exist".to_string());
    }
    let git_dir = path_buf.join(".git");
    if !git_dir.exists() {
        return Err("Not a git repository".to_string());
    }
    let file_path = file_path.trim();
    if file_path.is_empty() {
        return Err("File path is empty".to_string());
    }
    let full_path = path_buf.join(file_path);
    let exists = full_path.exists() && full_path.is_file();

    let mut diff_parts = vec![];
    if let Ok(staged) = run_git(&path_buf, &["diff", "--staged", "--", file_path]) {
        if !staged.is_empty() {
            diff_parts.push(format!("=== Staged changes ===\n{}\n", staged));
        }
    }
    if let Ok(unstaged) = run_git(&path_buf, &["diff", "--", file_path]) {
        if !unstaged.is_empty() {
            diff_parts.push(format!("=== Unstaged changes ===\n{}\n", unstaged));
        }
    }
    let diff = if diff_parts.is_empty() && exists {
        "(no changes or untracked file)".to_string()
    } else {
        diff_parts.join("\n")
    };

    let full_content = if exists {
        std::fs::read_to_string(&full_path).ok()
    } else {
        None
    };

    Ok(GitFileView { diff, full_content })
}

fn validate_git_repo(project_path: &str) -> Result<PathBuf, String> {
    let path_buf = PathBuf::from(project_path.trim());
    if path_buf.as_os_str().is_empty() {
        return Err("Project path is empty".to_string());
    }
    if !path_buf.exists() || !path_buf.is_dir() {
        return Err("Project path does not exist or is not a directory".to_string());
    }
    if !path_buf.join(".git").exists() {
        return Err("Not a git repository (no .git)".to_string());
    }
    Ok(path_buf)
}

#[tauri::command]
fn git_fetch(project_path: String) -> Result<String, String> {
    let path_buf = validate_git_repo(&project_path)?;
    run_git(&path_buf, &["fetch"])
}

#[tauri::command]
fn git_pull(project_path: String) -> Result<String, String> {
    let path_buf = validate_git_repo(&project_path)?;
    run_git(&path_buf, &["pull"])
}

#[tauri::command]
fn git_push(project_path: String) -> Result<String, String> {
    let path_buf = validate_git_repo(&project_path)?;
    run_git(&path_buf, &["push"])
}

#[tauri::command]
fn git_commit(project_path: String, message: String) -> Result<String, String> {
    let path_buf = validate_git_repo(&project_path)?;
    let msg = message.trim();
    if msg.is_empty() {
        return Err("Commit message cannot be empty".to_string());
    }
    run_git(&path_buf, &["add", "-A"])?;
    run_git(&path_buf, &["commit", "-m", msg])
}

fn is_valid_workspace(p: &PathBuf) -> bool {
    let has_implement_all = p.join("script").join("implement_all.sh").exists()
        || p.join("script").join("worker").join("implement_all.sh").exists();
    has_implement_all && p.join("data").is_dir()
}

fn data_dir(ws: &PathBuf) -> PathBuf {
    let data = ws.join("data");
    if data.is_dir() {
        data
    } else {
        ws.clone()
    }
}

fn script_path(ws: &PathBuf) -> PathBuf {
    if is_windows() {
        // Future: return .bat or .cmd path for Windows
        ws.join("script").join("run_prompts_all_projects.sh")
    } else {
        ws.join("script").join("run_prompts_all_projects.sh")
    }
}

fn analysis_script_path(ws: &PathBuf) -> PathBuf {
    if is_windows() {
        // Future: return Windows script path
        ws.join("script").join("run_analysis_single_project.sh")
    } else {
        ws.join("script").join("run_analysis_single_project.sh")
    }
}

fn implement_all_script_path(ws: &PathBuf) -> PathBuf {
    if is_windows() {
        // Future: return Windows script path
        ws.join("script").join("worker").join("implement_all.sh")
    } else {
        ws.join("script").join("worker").join("implement_all.sh")
    }
}

fn run_terminal_agent_script_path(ws: &PathBuf) -> PathBuf {
    if is_windows() {
        // Future: return Windows script path
        ws.join("script").join("worker").join("run_terminal_agent.sh")
    } else {
        ws.join("script").join("worker").join("run_terminal_agent.sh")
    }
}

fn run_claude_agent_script_path(ws: &PathBuf) -> PathBuf {
    if is_windows() {
        ws.join("script").join("worker").join("run_claude_agent.sh")
    } else {
        ws.join("script").join("worker").join("run_claude_agent.sh")
    }
}

fn run_gemini_agent_script_path(ws: &PathBuf) -> PathBuf {
    if is_windows() {
        ws.join("script").join("worker").join("run_gemini_agent.sh")
    } else {
        ws.join("script").join("worker").join("run_gemini_agent.sh")
    }
}

/// Resolve project root (contains script/ and data/). Tries current working directory first,
/// then walks up from the executable path so the app finds data when launched from any cwd.
fn project_root() -> Result<PathBuf, String> {
    // 1) Try current working directory (e.g. when running `tauri dev` from repo root)
    let mut candidate = std::env::current_dir().map_err(|e| e.to_string())?;
    if candidate.join("src-tauri").exists() {
        candidate = candidate.parent().unwrap_or(&candidate).to_path_buf();
    }
    if is_valid_workspace(&candidate) {
        return Ok(candidate);
    }

    // 2) Walk up from executable path (e.g. built app or dev binary in target/debug)
    if let Ok(exe) = std::env::current_exe() {
        let mut dir = exe.parent().map(PathBuf::from).unwrap_or_default();
        for _ in 0..20 {
            if dir.as_os_str().is_empty() {
                break;
            }
            if is_valid_workspace(&dir) {
                return Ok(dir);
            }
            if let Some(p) = dir.parent() {
                dir = p.to_path_buf();
            } else {
                break;
            }
        }
    }

    // #region agent log
    let err_msg = "Project root not found. Run the app from the repo root (contains script/worker/implement_all.sh and data/).";
    debug_log("lib.rs:project_root", "project_root returning Err", &[("err", err_msg)]);
    // #endregion
    Err(err_msg.to_string())
}

/// App data directory for the built app (e.g. ~/Library/Application Support/com.kwdev.app/data). Created if missing.
fn app_data_data_dir() -> Result<PathBuf, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
    #[cfg(target_os = "macos")]
    let app_data = PathBuf::from(&home).join("Library").join("Application Support").join("com.kwdev.app");
    #[cfg(not(target_os = "macos"))]
    let app_data = PathBuf::from(&home).join(".local").join("share").join("com.kwdev.app");
    let data = app_data.join("data");
    std::fs::create_dir_all(&data).map_err(|e| e.to_string())?;
    Ok(data)
}

/// Frontend can call this to append a debug log line (e.g. when running from Desktop so ingest server may be unreachable).
#[tauri::command]
fn frontend_debug_log(location: String, message: String, data: Option<serde_json::Value>) {
    let data = data.unwrap_or(serde_json::json!({}));
    let payload = serde_json::json!({
        "timestamp": SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis(),
        "location": location,
        "message": message,
        "data": data,
        "source": "frontend"
    });
    if let Ok(line) = serde_json::to_string(&payload) {
        if let Ok(dir) = app_data_data_dir() {
            let path = dir.join("debug.log");
            let _ = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&path)
                .and_then(|mut f| std::io::Write::write_all(&mut f, format!("{}\n", line).as_bytes()));
        }
    }
}

/// Returns the app version (from Cargo.toml package version) for display in Configuration and support.
#[tauri::command]
fn get_app_version(app: AppHandle) -> Result<String, String> {
    Ok(app.package_info().version.to_string())
}

/// Navigate the webview by setting window.location.href via eval. We never parse the URL in Rust nor call w.navigate(),
/// so the user never sees "The string did not match the expected pattern" (url crate / WebView).
#[tauri::command]
fn navigate_webview_to(app: AppHandle, url: String) -> Result<(), String> {
    let escaped = serde_json::to_string(&url).unwrap_or_else(|_| "\"/\"".to_string());
    let app_clone = app.clone();
    let _ = app.run_on_main_thread(move || {
        if let Some((_, w)) = app_clone.webview_windows().into_iter().next() {
            let _ = w.eval(&format!("window.location.href = {};", escaped));
        }
    });
    Ok(())
}

/// App Analyzer: fetch a URL and return status, headers, and body (body capped at 500 KB).
/// Only http and https schemes allowed.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchUrlResult {
    pub status_code: i32,
    pub headers: HashMap<String, String>,
    pub body: String,
}

const FETCH_BODY_LIMIT: usize = 500 * 1024; // 500 KB
const FETCH_TIMEOUT_SECS: u64 = 15;

#[tauri::command]
fn fetch_url(url: String) -> Result<FetchUrlResult, String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("URL is required".to_string());
    }
    let parsed = ParseUrl::parse(trimmed).map_err(|e| e.to_string())?;
    let scheme = parsed.scheme();
    if scheme != "http" && scheme != "https" {
        return Err(format!("URL scheme must be http or https, got: {}", scheme));
    }
    if trimmed.len() > 2048 {
        return Err("URL too long".to_string());
    }

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(FETCH_TIMEOUT_SECS))
        .user_agent("KWDEV-AppAnalyzer/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let res = client.get(trimmed).send().map_err(|e| e.to_string())?;
    let status_code = res.status().as_u16() as i32;
    let headers: HashMap<String, String> = res
        .headers()
        .iter()
        .filter_map(|(k, v)| {
            v.to_str()
                .ok()
                .map(|s| (k.as_str().to_string(), s.to_string()))
        })
        .collect();

    let body = res.bytes().map_err(|e| e.to_string())?;
    let body_str = String::from_utf8_lossy(&body);
    let body_trimmed = if body_str.len() > FETCH_BODY_LIMIT {
        body_str.chars().take(FETCH_BODY_LIMIT).collect::<String>()
    } else {
        body_str.to_string()
    };

    Ok(FetchUrlResult {
        status_code,
        headers,
        body: body_trimmed,
    })
}

/// Directory that holds app.db and february-dir.txt. In dev: repo data dir; when bundled: app data dir so DB and config work.
fn data_root() -> Result<PathBuf, String> {
    // #region agent log
    debug_log("lib.rs:data_root", "data_root called", &[]);
    // #endregion
    if let Ok(ws) = project_root() {
        // #region agent log
        debug_log("lib.rs:data_root", "data_root: using project_root", &[("path", ws.to_string_lossy().as_ref())]);
        // #endregion
        return Ok(data_dir(&ws));
    }
    // #region agent log
    debug_log("lib.rs:data_root", "data_root: project_root failed, using app_data_data_dir", &[]);
    // #endregion
    app_data_data_dir()
}

/// Read a file from disk and return its contents as base64 (for sending to API for PDF/text extraction).
#[tauri::command]
fn read_file_as_base64(path: String) -> Result<String, String> {
    let path_buf = PathBuf::from(path.trim());
    if !path_buf.exists() {
        return Err("File does not exist".to_string());
    }
    if !path_buf.is_file() {
        return Err("Path is not a file".to_string());
    }
    let bytes = std::fs::read(&path_buf).map_err(|e| e.to_string())?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&bytes))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
}

/// Read a text file under project root (script/ or data/). Path must be relative to project root or absolute under it.
#[tauri::command]
fn read_file_text(path: String) -> Result<String, String> {
    let ws = project_root()?;
    let path_buf = PathBuf::from(path.trim());
    let canonical = if path_buf.is_absolute() {
        path_buf.canonicalize().map_err(|e| e.to_string())?
    } else {
        ws.join(path_buf).canonicalize().map_err(|e| e.to_string())?
    };
    if !canonical.starts_with(ws.canonicalize().map_err(|e| e.to_string())?) {
        return Err("Path must be under project root".to_string());
    }
    if !canonical.is_file() {
        return Err("Path is not a file".to_string());
    }
    let content = std::fs::read_to_string(&canonical).map_err(|e| e.to_string())?;
    Ok(content)
}

/// Read a text file under a given root (e.g. project repo path). Use for project spec files from .cursor in another repo.
#[tauri::command]
fn read_file_text_under_root(root: String, path: String) -> Result<String, String> {
    let root_buf = PathBuf::from(root.trim());
    let root_canonical = root_buf.canonicalize().map_err(|e| e.to_string())?;
    let path_buf = PathBuf::from(path.trim());
    let canonical = if path_buf.is_absolute() {
        path_buf.canonicalize().map_err(|e| e.to_string())?
    } else {
        root_canonical.join(path_buf).canonicalize().map_err(|e| e.to_string())?
    };
    if !canonical.starts_with(&root_canonical) {
        return Err("Path must be under project root".to_string());
    }
    if !canonical.is_file() {
        return Err("Path is not a file".to_string());
    }
    let content = std::fs::read_to_string(&canonical).map_err(|e| e.to_string())?;
    Ok(content)
}

/// Entry for one directory listing (one level under a root). Matches frontend FileEntry shape.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirListingEntry {
    pub name: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    pub size: u64,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// List one level of files/dirs under a given root (e.g. project repo path). Used by Project Files in Stakeholder tab.
#[tauri::command]
fn list_files_under_root(root: String, path: String) -> Result<Vec<DirListingEntry>, String> {
    let root_buf = PathBuf::from(root.trim());
    let root_canonical = root_buf.canonicalize().map_err(|e| e.to_string())?;
    let path_buf = PathBuf::from(path.trim().trim_start_matches('/'));
    let full = if path_buf.as_os_str().is_empty() || path_buf == Path::new(".") {
        root_canonical.clone()
    } else {
        root_canonical.join(path_buf)
    };
    if !full.exists() {
        return Ok(vec![]);
    }
    let dir = full.canonicalize().map_err(|e| e.to_string())?;
    if !dir.starts_with(&root_canonical) {
        return Err("Path must be under project root".to_string());
    }
    if !dir.is_dir() {
        return Err("Path is not a directory".to_string());
    }
    let mut entries = Vec::new();
    for e in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let e = e.map_err(|e| e.to_string())?;
        let path = e.path();
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        if name.is_empty() || name == "." || name == ".." {
            continue;
        }
        let meta = std::fs::metadata(&path).map_err(|e| e.to_string())?;
        let is_directory = path.is_dir();
        let size = if is_directory { 0 } else { meta.len() };
        let updated_at = meta
            .modified()
            .ok()
            .map(|t| {
                let dt: DateTime<Utc> = t.into();
                dt.format("%Y-%m-%dT%H:%M:%SZ").to_string()
            })
            .unwrap_or_default();
        entries.push(DirListingEntry {
            name,
            is_directory,
            size,
            updated_at,
        });
    }
    entries.sort_by(|a, b| {
        if a.is_directory != b.is_directory {
            return a.is_directory.cmp(&b.is_directory).reverse();
        }
        a.name.to_lowercase().cmp(&b.name.to_lowercase())
    });
    Ok(entries)
}

/// List files in script/ directory.
#[tauri::command]
fn list_scripts() -> Result<Vec<FileEntry>, String> {
    let ws = project_root()?;
    let script_dir = ws.join("script");
    if !script_dir.is_dir() {
        return Ok(vec![]);
    }
    let mut entries = vec![];
    for e in std::fs::read_dir(&script_dir).map_err(|e| e.to_string())? {
        let e = e.map_err(|e| e.to_string())?;
        let path = e.path();
        if path.is_file() {
            let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
            let path_str = path.to_string_lossy().to_string();
            entries.push(FileEntry { name, path: path_str });
        }
    }
    entries.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(entries)
}

/// List all files under project_path/.cursor (recursive). Returns empty vec if .cursor does not exist or is not a directory.
#[tauri::command]
fn list_cursor_folder(project_path: String) -> Result<Vec<FileEntry>, String> {
    let base = PathBuf::from(project_path.trim()).join(".cursor");
    if !base.exists() || !base.is_dir() {
        return Ok(vec![]);
    }
    let mut entries = vec![];
    fn collect_files(dir: &Path, out: &mut Vec<FileEntry>) -> Result<(), String> {
        for e in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
            let e = e.map_err(|e| e.to_string())?;
            let path = e.path();
            if path.is_file() {
                let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
                let path_str = path.to_string_lossy().to_string();
                out.push(FileEntry { name, path: path_str });
            } else if path.is_dir() {
                collect_files(&path, out)?;
            }
        }
        Ok(())
    }
    collect_files(&base, &mut entries)?;
    entries.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(entries)
}

/// Read all files under the init template dir (relative to app/project root) and return a map of relative path -> content for Initialize.
#[tauri::command]
fn get_cursor_init_template() -> Result<std::collections::HashMap<String, String>, String> {
    let root = project_root()?;
    let template_dir = root.join(".cursor_template");
    if !template_dir.exists() || !template_dir.is_dir() {
        return Err("Template folder not found".to_string());
    }
    let mut out = std::collections::HashMap::new();
    fn collect(
        dir: &std::path::Path,
        base: &std::path::Path,
        out: &mut std::collections::HashMap<String, String>,
    ) -> Result<(), String> {
        for e in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
            let e = e.map_err(|e| e.to_string())?;
            let path = e.path();
            if path.is_file() {
                let rel = path.strip_prefix(base).map_err(|e| e.to_string())?;
                let rel_str = rel.to_string_lossy().replace('\\', "/");
                let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
                out.insert(rel_str, content);
            } else if path.is_dir() {
                collect(&path, base, out)?;
            }
        }
        Ok(())
    }
    collect(&template_dir, &template_dir, &mut out)?;
    Ok(out)
}

/// Resolve project_template.zip: try bundled resource first, then project root (for dev).
fn resolve_project_template_zip(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(path) = app.path().resolve("project_template.zip", BaseDirectory::Resource) {
        if path.exists() && path.is_file() {
            return Ok(path);
        }
    }
    let root = project_root()?;
    let zip_path = root.join("project_template.zip");
    if zip_path.exists() && zip_path.is_file() {
        Ok(zip_path)
    } else {
        Err("project_template.zip not found (bundle resource or next to app)".to_string())
    }
}

/// Unzip project_template.zip (from bundle resource or next to app) into target_path. Strips a single top-level
/// directory (e.g. project_template/) so the template contents land at target_path root.
#[tauri::command]
fn unzip_project_template(app: AppHandle, target_path: String) -> Result<(), String> {
    let zip_path = resolve_project_template_zip(&app)?;
    let target = PathBuf::from(target_path.trim());
    if !target.exists() || !target.is_dir() {
        return Err("Target path does not exist or is not a directory".to_string());
    }

    let file = std::fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    // Detect single top-level dir: if every entry starts with the same segment (e.g. "project_template/"), strip it.
    let mut prefix: Option<String> = None;
    for i in 0..archive.len() {
        let entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().replace('\\', "/").trim_end_matches('/').to_string();
        if name.is_empty() || name.contains("..") {
            continue;
        }
        if let Some(first) = name.split('/').next() {
            let seg = format!("{}/", first);
            match &prefix {
                None => prefix = Some(seg),
                Some(p) if p == &seg => {}
                _ => {
                    prefix = None;
                    break;
                }
            }
        }
    }
    // If we have only one top-level segment for all, use it as prefix to strip
    let strip_prefix = prefix.filter(|p| !p.is_empty());

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let raw_name = entry.name().replace('\\', "/");
        let name = raw_name.trim_end_matches('/');
        if name.is_empty() || name.contains("..") {
            continue;
        }
        let relative = match &strip_prefix {
            Some(p) if name.starts_with(p) => name.strip_prefix(p).unwrap_or(name),
            _ => name,
        };
        let relative = relative.trim_start_matches('/');
        if relative.is_empty() {
            continue;
        }
        let out_path = target.join(relative);
        if entry.is_dir() {
            std::fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out_path.parent() {
                std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut buf = Vec::new();
            entry.read_to_end(&mut buf).map_err(|e| e.to_string())?;
            std::fs::write(&out_path, &buf).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Resolve cursor init zip: try bundled resource first (cursor_init.zip), then project root (.cursor_init.zip or cursor_init.zip).
fn resolve_cursor_init_zip(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(path) = app.path().resolve("cursor_init.zip", BaseDirectory::Resource) {
        if path.exists() && path.is_file() {
            return Ok(path);
        }
    }
    if let Ok(root) = project_root() {
        for name in [".cursor_init.zip", "cursor_init.zip"] {
            let zip_path = root.join(name);
            if zip_path.exists() && zip_path.is_file() {
                return Ok(zip_path);
            }
        }
    }
    Err(".cursor_init.zip / cursor_init.zip not found (bundle resource or repo root)".to_string())
}

/// Resolve cursor_init directory at project root (fallback when no zip).
fn resolve_cursor_init_dir() -> Result<PathBuf, String> {
    let root = project_root()?;
    let dir_path = root.join("cursor_init");
    if dir_path.exists() && dir_path.is_dir() {
        return Ok(dir_path);
    }
    Err("cursor_init directory not found at repo root".to_string())
}

/// Copy directory contents into cursor_dir. Strips one top-level segment (e.g. cursor_init/) so contents land in .cursor.
/// Respects merge_if_exists: skip existing files when true.
fn copy_cursor_init_dir(
    source_dir: &std::path::Path,
    cursor_dir: &std::path::Path,
    merge_if_exists: bool,
) -> Result<(), String> {
    let children: Vec<(std::ffi::OsString, std::path::PathBuf)> = std::fs::read_dir(source_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| {
            let e = e.ok()?;
            let name = e.file_name();
            let name_str = name.to_string_lossy();
            if name_str == "." || name_str == ".." {
                return None;
            }
            Some((name, e.path()))
        })
        .collect();
    if children.len() == 1 {
        let (_, only_path) = &children[0];
        if only_path.is_dir() {
            return copy_cursor_init_dir(only_path, cursor_dir, merge_if_exists);
        }
    }
    for (_name, src_path) in children {
        let name = src_path.file_name().unwrap_or_else(|| std::ffi::OsStr::new(""));
        let name_str = name.to_string_lossy();
        if name_str.starts_with('.') && (name_str == "." || name_str == "..") {
            continue;
        }
        let dest_path = cursor_dir.join(&name);
        let meta = std::fs::metadata(&src_path).map_err(|e| e.to_string())?;
        if meta.is_dir() {
            if !dest_path.exists() {
                std::fs::create_dir_all(&dest_path).map_err(|e| e.to_string())?;
            }
            copy_cursor_init_dir(&src_path, &dest_path, merge_if_exists)?;
        } else {
            if merge_if_exists && dest_path.exists() {
                continue;
            }
            if let Some(parent) = dest_path.parent() {
                std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            std::fs::copy(&src_path, &dest_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Unzip .cursor_init.zip (or cursor_init.zip) into target_path/.cursor/, or copy cursor_init/ folder if no zip.
/// Strips a single top-level directory (e.g. cursor_init/). If merge_if_exists, skip existing destination files.
#[tauri::command]
fn unzip_cursor_init(app: AppHandle, target_path: String, merge_if_exists: bool) -> Result<(), String> {
    let target_base = PathBuf::from(target_path.trim());
    if !target_base.exists() || !target_base.is_dir() {
        return Err("Target path does not exist or is not a directory".to_string());
    }
    let cursor_dir = target_base.join(".cursor");

    // Prefer zip; fall back to cursor_init directory
    let zip_path = match resolve_cursor_init_zip(&app) {
        Ok(p) => p,
        Err(_) => {
            let dir_path = resolve_cursor_init_dir()?;
            std::fs::create_dir_all(&cursor_dir).map_err(|e| e.to_string())?;
            return copy_cursor_init_dir(&dir_path, &cursor_dir, merge_if_exists);
        }
    };

    std::fs::create_dir_all(&cursor_dir).map_err(|e| e.to_string())?;
    let file = std::fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    let mut prefix: Option<String> = None;
    for i in 0..archive.len() {
        let entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().replace('\\', "/").trim_end_matches('/').to_string();
        if name.is_empty() || name.contains("..") {
            continue;
        }
        if name == "__MACOSX" || name.starts_with("__MACOSX/") {
            continue;
        }
        if let Some(first) = name.split('/').next() {
            let seg = format!("{}/", first);
            match &prefix {
                None => prefix = Some(seg),
                Some(p) if p == &seg => {}
                _ => {
                    prefix = None;
                    break;
                }
            }
        }
    }
    let strip_prefix = prefix.filter(|p| !p.is_empty());

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let raw_name = entry.name().replace('\\', "/");
        let name = raw_name.trim_end_matches('/');
        if name.is_empty() || name.contains("..") {
            continue;
        }
        if name == "__MACOSX" || name.starts_with("__MACOSX/") {
            continue;
        }
        let relative = match &strip_prefix {
            Some(p) if name.starts_with(p) => name.strip_prefix(p).unwrap_or(name),
            _ => name,
        };
        let relative = relative.trim_start_matches('/');
        if relative.is_empty() {
            continue;
        }
        let prefix_segment = strip_prefix.as_ref().map(|s| s.trim_end_matches('/'));
        if prefix_segment.as_deref() == Some(relative) {
            continue;
        }
        let out_path = cursor_dir.join(relative);
        if entry.is_dir() {
            if !out_path.exists() {
                std::fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
            }
        } else {
            if merge_if_exists && out_path.exists() {
                continue;
            }
            if let Some(parent) = out_path.parent() {
                std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut buf = Vec::new();
            entry.read_to_end(&mut buf).map_err(|e| e.to_string())?;
            std::fs::write(&out_path, &buf).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Write a spec file into the project directory (e.g. project_path + "/.cursor/design-x.md").
/// Creates parent directories if needed. relative_path should be like ".cursor/design-abc.md".
#[tauri::command]
fn write_spec_file(project_path: String, relative_path: String, content: String) -> Result<(), String> {
    let base = PathBuf::from(project_path.trim());
    if !base.exists() || !base.is_dir() {
        return Err("Project path does not exist or is not a directory".to_string());
    }
    let full = base.join(relative_path.trim().trim_start_matches('/'));
    if let Some(parent) = full.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&full, content).map_err(|e| e.to_string())?;
    Ok(())
}

/// Archive .cursor/7. planner/tickets.md or .cursor/7. planner/features.md to .cursor/legacy/{file}-YYYY-MM-DD.md and create a new empty file.
/// file_kind must be "tickets" or "features".
#[tauri::command]
fn archive_cursor_file(project_path: String, file_kind: String) -> Result<(), String> {
    let base = PathBuf::from(project_path.trim());
    if !base.exists() || !base.is_dir() {
        return Err("Project path does not exist or is not a directory".to_string());
    }
    let (cursor_file, legacy_prefix, minimal_content) = match file_kind.trim() {
        "tickets" => (
            ".cursor/7. planner/tickets.md",
            "tickets",
            "# Work items (tickets) — (project name)\n\n**Project:** (set)\n**Source:** Archived and reset\n**Last updated:** (date)\n\n---\n\n## Summary: Done vs missing\n\n### Done\n\n| Area | What's implemented |\n\n### Missing or incomplete\n\n| Area | Gap |\n\n---\n\n## Prioritized work items (tickets)\n\n### P0 — Critical / foundation\n
#### Feature: (add feature name)\n
- [ ] #1 (add ticket)\n
### P1 — High / quality and maintainability\n
### P2 — Medium / polish and scale\n
### P3 — Lower / later\n
## Next steps\n
1. Add tickets under features.\n",
        ),
        "features" => (
            ".cursor/7. planner/features.md",
            "features",
            "# Features roadmap\n\nFeatures below are derived from .cursor/7. planner/tickets.md. Add features as checklist items with ticket refs, e.g. `- [ ] Feature name — #1, #2`.\n\n## Major features\n\n- [ ] (add feature)\n",
        ),
        _ => return Err("file_kind must be 'tickets' or 'features'".to_string()),
    };
    let cursor_path = base.join(cursor_file);
    let content = if cursor_path.exists() {
        std::fs::read_to_string(&cursor_path).unwrap_or_else(|_| String::new())
    } else {
        String::new()
    };
    let date = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let legacy_name = format!("{}-{}.md", legacy_prefix, date);
    let legacy_path = base.join(".cursor").join("legacy");
    std::fs::create_dir_all(&legacy_path).map_err(|e| e.to_string())?;
    let legacy_full = legacy_path.join(&legacy_name);
    std::fs::write(&legacy_full, content).map_err(|e| e.to_string())?;
    std::fs::write(&cursor_path, minimal_content).map_err(|e| e.to_string())?;
    Ok(())
}

/// List JSON files in data/ directory.

/// Result of analyzing a project directory for AI ticket generation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectAnalysis {
    pub name: String,
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub package_json: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub readme_snippet: Option<String>,
    pub top_level_dirs: Vec<String>,
    pub top_level_files: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub config_snippet: Option<String>,
}

const README_MAX_CHARS: usize = 8000;
const CONFIG_MAX_CHARS: usize = 4000;

/// Analyze a project directory for AI ticket generation: read package.json, README, list top-level structure.
/// Path must be an existing directory (e.g. from all_projects list).
#[tauri::command]
fn analyze_project_for_tickets(project_path: String) -> Result<ProjectAnalysis, String> {
    let path_buf = PathBuf::from(project_path.trim());
    if !path_buf.exists() || !path_buf.is_dir() {
        return Err("Project path does not exist or is not a directory".to_string());
    }
    let name = path_buf
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("project")
        .to_string();
    let path_str = path_buf.to_string_lossy().to_string();

    let package_json = path_buf
        .join("package.json")
        .exists()
        .then(|| std::fs::read_to_string(path_buf.join("package.json")))
        .and_then(Result::ok);

    let readme_snippet = ["README.md", "readme.md", "README.MD"]
        .iter()
        .find(|f| path_buf.join(f).exists())
        .and_then(|f| std::fs::read_to_string(path_buf.join(f)).ok())
        .map(|s| {
            let t = s.trim();
            if t.len() > README_MAX_CHARS {
                format!("{}...", &t[..README_MAX_CHARS])
            } else {
                t.to_string()
            }
        });

    let mut top_level_dirs = Vec::new();
    let mut top_level_files = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&path_buf) {
        for e in entries.flatten() {
            let p = e.path();
            if let Some(n) = p.file_name().and_then(|n| n.to_str()) {
                if n.starts_with('.') && n != ".git" {
                    continue;
                }
                if p.is_dir() {
                    top_level_dirs.push(n.to_string());
                } else {
                    top_level_files.push(n.to_string());
                }
            }
        }
    }
    top_level_dirs.sort();
    top_level_files.sort();

    let config_snippet = ["tsconfig.json", "vite.config.ts", "vite.config.js", "next.config.mjs", "next.config.js", "Cargo.toml", "pyproject.toml", "requirements.txt"]
        .iter()
        .find(|f| path_buf.join(f).exists())
        .and_then(|f| std::fs::read_to_string(path_buf.join(f)).ok())
        .map(|s| {
            let t = s.trim();
            if t.len() > CONFIG_MAX_CHARS {
                format!("{}...", &t[..CONFIG_MAX_CHARS])
            } else {
                t.to_string()
            }
        });

    Ok(ProjectAnalysis {
        name,
        path: path_str,
        package_json,
        readme_snippet,
        top_level_dirs,
        top_level_files,
        config_snippet,
    })
}

fn with_db<F, T>(f: F) -> Result<T, String>
where
    F: FnOnce(&rusqlite::Connection) -> Result<T, String>,
{
    let data = data_root()?;
    let conn = db::open_db(&data.join("app.db"))?;
    seed_initial_data(&conn)?; // New seeding call
    f(&conn)
}

/// Resolve data directory from DB (ADR 069). Uses path stored in kv_store, or fallback from data root, and persists it.
#[tauri::command]
fn resolve_data_dir() -> Result<PathBuf, String> {
    let fallback = data_root()?;
    with_db(|conn| Ok(db::get_data_dir(conn, &fallback)))
}

/// Project record (camelCase for frontend). Stored in projects table.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    /// Optional on create; generated if missing or empty.
    #[serde(default)]
    pub id: String,
    /// Default so partial updates (e.g. { runPort }) deserialize without sending name.
    #[serde(default)]
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repo_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub run_port: Option<u16>,
    #[serde(default)]
    pub prompt_ids: Vec<i64>,
    #[serde(default)]
    pub ticket_ids: Vec<String>,
    #[serde(default)]
    pub feature_ids: Vec<String>,
    #[serde(default)]
    pub idea_ids: Vec<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub design_ids: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub architecture_ids: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entity_categories: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spec_files: Option<Vec<serde_json::Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spec_files_tickets: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spec_files_features: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

fn project_row_to_project(row: &db::ProjectRow) -> Project {
    let prompt_ids: Vec<i64> = serde_json::from_str(&row.prompt_ids).unwrap_or_default();
    let ticket_ids: Vec<String> = serde_json::from_str(&row.ticket_ids).unwrap_or_default();
    let idea_ids: Vec<i64> = serde_json::from_str(&row.idea_ids).unwrap_or_default();
    let design_ids: Option<Vec<String>> = serde_json::from_str(&row.design_ids).ok();
    let architecture_ids: Option<Vec<String>> = serde_json::from_str(&row.architecture_ids).ok();
    let entity_categories: Option<serde_json::Value> = row
        .entity_categories
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok());
    let spec_files: Option<Vec<serde_json::Value>> = row
        .spec_files
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok());
    let spec_files_tickets: Option<Vec<String>> = row
        .spec_files_tickets
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok());
    let run_port = row
        .run_port
        .filter(|&p| p >= 0 && p <= 65535)
        .map(|p| p as u16);
    Project {
        id: row.id.clone(),
        name: row.name.clone(),
        description: row.description.clone(),
        repo_path: row.repo_path.clone(),
        run_port,
        prompt_ids,
        ticket_ids,
        feature_ids: vec![],
        idea_ids,
        design_ids,
        architecture_ids,
        entity_categories,
        spec_files,
        spec_files_tickets,
        spec_files_features: None,
        created_at: Some(row.created_at.clone()),
        updated_at: Some(row.updated_at.clone()),
    }
}

fn project_to_row(p: &Project, created_at: &str, updated_at: &str) -> db::ProjectRow {
    db::ProjectRow {
        id: p.id.clone(),
        name: p.name.clone(),
        description: p.description.clone(),
        repo_path: p.repo_path.clone(),
        run_port: p.run_port.map(i32::from),
        prompt_ids: serde_json::to_string(&p.prompt_ids).unwrap_or_else(|_| "[]".to_string()),
        ticket_ids: serde_json::to_string(&p.ticket_ids).unwrap_or_else(|_| "[]".to_string()),
        idea_ids: serde_json::to_string(&p.idea_ids).unwrap_or_else(|_| "[]".to_string()),
        design_ids: p
            .design_ids
            .as_ref()
            .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "[]".to_string()))
            .unwrap_or_else(|| "[]".to_string()),
        architecture_ids: p
            .architecture_ids
            .as_ref()
            .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "[]".to_string()))
            .unwrap_or_else(|| "[]".to_string()),
        entity_categories: p
            .entity_categories
            .as_ref()
            .and_then(|v| serde_json::to_string(v).ok()),
        spec_files: p
            .spec_files
            .as_ref()
            .and_then(|v| serde_json::to_string(v).ok()),
        spec_files_tickets: p
            .spec_files_tickets
            .as_ref()
            .and_then(|v| serde_json::to_string(v).ok()),
        created_at: created_at.to_string(),
        updated_at: updated_at.to_string(),
    }
}

fn list_projects_impl(conn: &rusqlite::Connection) -> Result<Vec<Project>, String> {
    let rows = db::get_projects_from_table(conn)?;
    Ok(rows.iter().map(project_row_to_project).collect())
}

#[tauri::command]
fn list_projects() -> Result<Vec<Project>, String> {
    with_db(list_projects_impl)
}

#[tauri::command]
fn get_project(id: String) -> Result<Option<Project>, String> {
    with_db(|conn| {
        let projects = list_projects_impl(conn)?;
        Ok(projects.into_iter().find(|p| p.id == id))
    })
}

#[tauri::command]
fn create_project(project: Project) -> Result<Project, String> {
    // #region agent log
    debug_log("lib.rs:create_project", "create_project command entered", &[("name", project.name.as_str())]);
    // #endregion
    with_db(|conn| {
        let now = now_iso();
        let mut p = project;
        if p.id.is_empty() {
            p.id = uuid::Uuid::new_v4().to_string();
        }
        p.created_at.get_or_insert(now.clone());
        p.updated_at = Some(now.clone());
        let row = project_to_row(&p, p.created_at.as_deref().unwrap_or(&now), &now);
        db::insert_project(conn, &row)?;
        Ok(p)
    })
}

#[tauri::command]
fn update_project(id: String, project: serde_json::Value) -> Result<Project, String> {
    with_db(|conn| {
        let rows = db::get_projects_from_table(conn)?;
        let base_row = rows.iter().find(|r| r.id == id).ok_or("Project not found")?;
        let base = project_row_to_project(base_row);
        let updated: Project = serde_json::from_value(project).map_err(|e| e.to_string())?;
        let merged = Project {
            id: base.id.clone(),
            name: if updated.name.is_empty() { base.name } else { updated.name },
            description: updated.description.or(base.description),
            repo_path: updated.repo_path.or(base.repo_path),
            run_port: updated.run_port.or(base.run_port),
            prompt_ids: if updated.prompt_ids.is_empty() { base.prompt_ids } else { updated.prompt_ids },
            ticket_ids: if updated.ticket_ids.is_empty() { base.ticket_ids } else { updated.ticket_ids },
            feature_ids: if updated.feature_ids.is_empty() { base.feature_ids } else { updated.feature_ids },
            idea_ids: if updated.idea_ids.is_empty() { base.idea_ids } else { updated.idea_ids },
            design_ids: updated.design_ids.or(base.design_ids),
            architecture_ids: updated.architecture_ids.or(base.architecture_ids),
            entity_categories: updated.entity_categories.or(base.entity_categories),
            spec_files: updated.spec_files.or(base.spec_files),
            spec_files_tickets: updated.spec_files_tickets.or(base.spec_files_tickets),
            spec_files_features: updated.spec_files_features.or(base.spec_files_features),
            created_at: base.created_at,
            updated_at: Some(now_iso()),
        };
        let now = merged.updated_at.as_deref().unwrap_or("");
        let row = project_to_row(&merged, base_row.created_at.as_str(), now);
        db::update_project(conn, &id, &row)?;
        Ok(merged)
    })
}

#[tauri::command]
fn delete_project(id: String) -> Result<(), String> {
    with_db(|conn| db::delete_project(conn, &id))
}

/// Resolved project: project + linked prompts, tickets, features, ideas (empty), designs, architectures (empty).
#[tauri::command]
fn get_project_resolved(id: String) -> Result<serde_json::Value, String> {
    let project = with_db(|conn| {
        let projects = list_projects_impl(conn)?;
        projects.into_iter().find(|p| p.id == id).ok_or("Project not found".to_string())
    })?;
    let tickets = with_db(db::get_tickets).unwrap_or_default();
    let features = with_db(db::get_features).unwrap_or_default();
    let prompts = with_db(db::get_prompts).unwrap_or_default();
    let designs = with_db(db::get_designs).unwrap_or_default();
    let prompt_ids: Vec<i64> = project.prompt_ids.iter().copied().collect();
    let ticket_ids: Vec<String> = project.ticket_ids.clone();
    let feature_ids: Vec<String> = project.feature_ids.clone();
    let design_ids: Vec<String> = project.design_ids.as_deref().unwrap_or(&[]).to_vec();
    let prompts_resolved: Vec<serde_json::Value> = prompt_ids
        .iter()
        .filter_map(|pid| {
            prompts.iter().find(|p| p.id.parse::<i64>().ok() == Some(*pid)).map(|p| {
                serde_json::json!({
                    "id": p.id.parse::<i64>().unwrap_or(0),
                    "title": p.title,
                    "content": p.content,
                })
            })
        })
        .collect();
    let tickets_resolved: Vec<serde_json::Value> = ticket_ids
        .iter()
        .filter_map(|tid| {
            tickets.iter().find(|t| t.id == *tid).map(|t| {
                serde_json::json!({
                    "id": t.id,
                    "title": t.title,
                    "status": t.status,
                    "description": t.description,
                })
            })
        })
        .collect();
    let features_resolved: Vec<serde_json::Value> = feature_ids
        .iter()
        .filter_map(|fid| {
            features.iter().find(|f| f.id == *fid).map(|f| {
                serde_json::json!({
                    "id": f.id,
                    "title": f.title,
                    "prompt_ids": f.prompt_ids,
                    "project_paths": f.project_paths,
                })
            })
        })
        .collect();
    let designs_resolved: Vec<serde_json::Value> = design_ids
        .iter()
        .filter_map(|did| {
            designs.iter().find(|d| d.id == *did).map(|d| {
                serde_json::json!({ "id": d.id, "name": d.name })
            })
        })
        .collect();
    let ideas_empty: Vec<serde_json::Value> = vec![];
    let architectures_empty: Vec<serde_json::Value> = vec![];
    let resolved = serde_json::json!({
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "repoPath": project.repo_path,
        "runPort": project.run_port,
        "promptIds": project.prompt_ids,
        "ticketIds": project.ticket_ids,
        "featureIds": project.feature_ids,
        "ideaIds": project.idea_ids,
        "designIds": project.design_ids,
        "architectureIds": project.architecture_ids,
        "entityCategories": project.entity_categories,
        "prompts": prompts_resolved,
        "tickets": tickets_resolved,
        "features": features_resolved,
        "ideas": ideas_empty,
        "designs": designs_resolved,
        "architectures": architectures_empty,
    });
    Ok(resolved)
}

#[tauri::command]
fn get_project_export(id: String, category: String) -> Result<String, String> {
    let resolved = get_project_resolved(id)?;
    let value = match category.as_str() {
        "prompts" => resolved.get("prompts"),
        "tickets" => resolved.get("tickets"),
        "features" => resolved.get("features"),
        "ideas" => resolved.get("ideas"),
        "designs" => resolved.get("designs"),
        "architectures" => resolved.get("architectures"),
        "project" => Some(&resolved),
        _ => return Err(format!("Unknown category: {}", category)),
    };
    let out = value
        .map(|v| serde_json::to_string(v).map_err(|e| e.to_string()))
        .unwrap_or_else(|| Ok("[]".to_string()))?;
    Ok(out)
}

#[tauri::command]
fn get_all_projects() -> Result<Vec<String>, String> {
    with_db(db::get_all_projects)
}

/// Collect direct subdirectory paths under `dir` only (one level). Include every entry that is a directory or a symlink (so we don't drop folders or symlinks on macOS).
fn list_subdir_paths(dir: &Path) -> Result<Vec<String>, String> {
    let mut paths = vec![];
    let entries = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        if name_str == "." || name_str == ".." {
            continue;
        }
        if name_str.starts_with('.') {
            continue;
        }
        let full = dir.join(&name);
        let is_symlink = entry.file_type().map(|ft| ft.is_symlink()).unwrap_or(false);
        let is_dir = full.is_dir();
        if !is_dir && !is_symlink {
            continue;
        }
        let path_str = full.to_string_lossy().to_string();
        paths.push(path_str);
    }
    Ok(paths)
}

/// One entry in the debug listing: why it was included or skipped.
#[derive(serde::Serialize)]
struct FebruaryFolderDebugEntry {
    name: String,
    included: bool,
    is_dir: bool,
    is_symlink: bool,
    file_type_err: Option<String>,
}

/// Parse FEBRUARY_DIR= value from a line of .env content.
fn parse_february_dir_line(line: &str) -> Option<PathBuf> {
    let line = line.trim();
    if !line.starts_with("FEBRUARY_DIR=") {
        return None;
    }
    let value = line["FEBRUARY_DIR=".len()..].trim().trim_matches('"').trim_matches('\'');
    if value.is_empty() {
        return None;
    }
    let pb = PathBuf::from(value);
    if pb.is_absolute() {
        Some(pb)
    } else {
        None
    }
}

/// Read all lines from path_file; return path as PathBuf if absolute and existing dir.
fn read_february_dirs_from_file(path_file: &Path) -> Vec<PathBuf> {
    let content = match std::fs::read_to_string(path_file) {
        Ok(c) => c,
        Err(_) => return vec![],
    };
    let mut out = vec![];
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let pb = PathBuf::from(line);
        if pb.is_absolute() && pb.is_dir() {
            out.push(pb);
        }
    }
    out
}

/// Read all projects root paths from data/february-dir.txt (one path per line). Check project data dir, cwd/data, then walk up from exe.
fn february_dirs_from_data_file() -> Vec<PathBuf> {
    if let Ok(ws) = project_root() {
        let data = data_dir(&ws);
        let path_file = data.join("february-dir.txt");
        if path_file.exists() {
            let dirs = read_february_dirs_from_file(&path_file);
            if !dirs.is_empty() {
                return dirs;
            }
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        let path_file = cwd.join("data").join("february-dir.txt");
        if path_file.exists() {
            let dirs = read_february_dirs_from_file(&path_file);
            if !dirs.is_empty() {
                return dirs;
            }
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        let mut dir = exe.parent().map(PathBuf::from).unwrap_or_default();
        for _ in 0..15 {
            if dir.as_os_str().is_empty() {
                break;
            }
            let path_file = dir.join("data").join("february-dir.txt");
            if path_file.exists() {
                let dirs = read_february_dirs_from_file(&path_file);
                if !dirs.is_empty() {
                    return dirs;
                }
            }
            if let Some(p) = dir.parent() {
                dir = p.to_path_buf();
            } else {
                break;
            }
        }
    }
    // 4) Bundled app: use app data dir so user can add february-dir.txt there
    if let Ok(data_dir) = app_data_data_dir() {
        let path_file = data_dir.join("february-dir.txt");
        if path_file.exists() {
            let dirs = read_february_dirs_from_file(&path_file);
            if !dirs.is_empty() {
                return dirs;
            }
        }
    }
    vec![]
}

/// Parse FEBRUARY_DIR= value from a line; may contain multiple paths separated by ; or ,.
fn parse_february_dir_line_multi(line: &str) -> Vec<PathBuf> {
    let line = line.trim();
    if !line.starts_with("FEBRUARY_DIR=") {
        return vec![];
    }
    let value = line["FEBRUARY_DIR=".len()..].trim().trim_matches('"').trim_matches('\'');
    let mut out = vec![];
    for part in value.split(&[';', ','][..]) {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }
        let pb = PathBuf::from(part);
        if pb.is_absolute() {
            out.push(pb);
        }
    }
    out
}

/// All configured projects roots: data/february-dir.txt (all lines) + FEBRUARY_DIR (split by ; or ,).
fn resolve_february_dirs() -> Vec<PathBuf> {
    let mut candidates: Vec<PathBuf> = february_dirs_from_data_file();
    if !candidates.is_empty() {
        return candidates;
    }
    if let Ok(val) = std::env::var("FEBRUARY_DIR") {
        for part in val.split(&[';', ','][..]) {
            let part = part.trim();
            if part.is_empty() {
                continue;
            }
            let pb = PathBuf::from(part);
            if pb.is_absolute() {
                candidates.push(pb);
            }
        }
    }
    if !candidates.is_empty() {
        return candidates;
    }
    let try_env_file = |path: &Path| -> Vec<PathBuf> {
        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => return vec![],
        };
        for line in content.lines() {
            let parsed = parse_february_dir_line_multi(line);
            if !parsed.is_empty() {
                return parsed;
            }
            if let Some(pb) = parse_february_dir_line(line) {
                return vec![pb];
            }
        }
        vec![]
    };
    if let Ok(ws) = project_root() {
        let dirs = try_env_file(&ws.join(".env"));
        if !dirs.is_empty() {
            return dirs;
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        let dirs = try_env_file(&cwd.join(".env"));
        if !dirs.is_empty() {
            return dirs;
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        let mut dir = exe.parent().map(PathBuf::from).unwrap_or_default();
        for _ in 0..15 {
            if dir.as_os_str().is_empty() {
                break;
            }
            let dirs = try_env_file(&dir.join(".env"));
            if !dirs.is_empty() {
                return dirs;
            }
            if let Some(p) = dir.parent() {
                dir = p.to_path_buf();
            } else {
                break;
            }
        }
    }
    vec![]
}

/// Debug: list every read_dir entry with included/is_dir/is_symlink so we can see why a folder is skipped.
fn list_subdir_paths_debug(dir: &Path) -> Result<Vec<FebruaryFolderDebugEntry>, String> {
    let mut out = vec![];
    let entries = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let (name_str, is_dir, is_symlink, file_type_err) = match &entry {
            Ok(e) => {
                let name = e.file_name();
                let name_str = name.to_string_lossy().to_string();
                if name_str == "." || name_str == ".." || name_str.starts_with('.') {
                    continue;
                }
                let full = dir.join(&name);
                let ft = e.file_type();
                let (is_symlink, file_type_err) = match &ft {
                    Ok(ft) => (ft.is_symlink(), None),
                    Err(e) => (false, Some(e.to_string())),
                };
                let is_dir = full.is_dir();
                (name_str, is_dir, is_symlink, file_type_err)
            }
            Err(e) => {
                out.push(FebruaryFolderDebugEntry {
                    name: format!("<error: {}>", e),
                    included: false,
                    is_dir: false,
                    is_symlink: false,
                    file_type_err: Some(e.to_string()),
                });
                continue;
            }
        };
        let included = is_dir || is_symlink;
        out.push(FebruaryFolderDebugEntry {
            name: name_str,
            included,
            is_dir,
            is_symlink,
            file_type_err,
        });
    }
    Ok(out)
}

/// Debug: return raw folder names from the first configured root (to verify what the backend sees).
#[tauri::command]
fn list_february_folders_debug() -> Result<serde_json::Value, String> {
    let mut candidates: Vec<PathBuf> = resolve_february_dirs()
        .into_iter()
        .filter(|pb| pb.is_dir())
        .collect();
    if candidates.is_empty() {
        if let Ok(ws) = project_root() {
            if let Some(parent) = ws.parent() {
                let parent_buf = parent.to_path_buf();
                if parent_buf.is_dir() {
                    candidates.push(parent_buf);
                }
            }
        }
    }
    let root = candidates.first().cloned().unwrap_or_else(PathBuf::new);
    let root_str = root.to_string_lossy().to_string();
    let names: Vec<String> = list_subdir_paths(&root)
        .unwrap_or_default()
        .into_iter()
        .filter_map(|p| PathBuf::from(&p).file_name().map(|n| n.to_string_lossy().to_string()))
        .collect();
    let out = serde_json::json!({
        "root": root_str,
        "count": names.len(),
        "names": names
    });
    Ok(out)
}

/// Debug: return every read_dir entry with included/is_dir/is_symlink/file_type_err so we can see why a folder is skipped.
#[tauri::command]
fn list_february_folders_debug_entries() -> Result<serde_json::Value, String> {
    let mut candidates: Vec<PathBuf> = resolve_february_dirs()
        .into_iter()
        .filter(|pb| pb.is_dir())
        .collect();
    if candidates.is_empty() {
        if let Ok(ws) = project_root() {
            if let Some(parent) = ws.parent() {
                let parent_buf = parent.to_path_buf();
                if parent_buf.is_dir() {
                    candidates.push(parent_buf);
                }
            }
        }
    }
    let root = candidates.first().cloned().unwrap_or_else(PathBuf::new);
    let root_str = root.to_string_lossy().to_string();
    let entries = list_subdir_paths_debug(&root).unwrap_or_default();
    let skipped: Vec<&FebruaryFolderDebugEntry> = entries.iter().filter(|e| !e.included).collect();
    let out = serde_json::json!({
        "root": root_str,
        "total_entries": entries.len(),
        "included_count": entries.iter().filter(|e| e.included).count(),
        "skipped": skipped.iter().map(|e| serde_json::json!({
            "name": e.name,
            "is_dir": e.is_dir,
            "is_symlink": e.is_symlink,
            "file_type_err": e.file_type_err
        })).collect::<Vec<_>>(),
        "entries": entries.iter().map(|e| serde_json::json!({
            "name": e.name,
            "included": e.included,
            "is_dir": e.is_dir,
            "is_symlink": e.is_symlink,
            "file_type_err": e.file_type_err
        })).collect::<Vec<_>>()
    });
    Ok(out)
}

/// List all subdirectories of the configured projects root(s). Used by Projects page Local repos card.
/// No filter by name—every folder is included. Paths from data/february-dir.txt (one per line) or FEBRUARY_DIR (; or , separated); else parent of project root.
#[tauri::command]
fn list_february_folders() -> Result<Vec<String>, String> {
    let mut candidates: Vec<PathBuf> = resolve_february_dirs()
        .into_iter()
        .filter(|pb| pb.is_dir())
        .collect();
    let mut seen = HashSet::new();
    candidates.retain(|pb| seen.insert(pb.clone()));

    if candidates.is_empty() {
        if let Ok(ws) = project_root() {
            if let Some(parent) = ws.parent() {
                let parent_buf = parent.to_path_buf();
                let canonical_parent = parent_buf.canonicalize().ok().unwrap_or(parent_buf);
                if canonical_parent.is_dir() {
                    candidates.push(canonical_parent);
                }
            }
        }
    }

    let mut seen = HashSet::new();
    let mut paths = vec![];
    for dir in &candidates {
        if let Ok(subdirs) = list_subdir_paths(dir) {
            for s in subdirs {
                if seen.insert(s.clone()) {
                    paths.push(s);
                }
            }
        }
    }
    paths.sort();
    Ok(paths)
}

#[tauri::command]
fn get_active_projects() -> Result<Vec<String>, String> {
    with_db(db::get_active_projects)
}

#[tauri::command]
fn get_prompts() -> Result<Vec<Prompt>, String> {
    with_db(db::get_prompts)
}

#[tauri::command]
fn save_prompts(prompts: Vec<Prompt>) -> Result<(), String> {
    with_db(|conn| db::save_prompts(conn, &prompts))
}

#[tauri::command]
fn add_prompt(title: String, content: String) -> Result<Prompt, String> {
    let mut prompts = with_db(db::get_prompts).map_err(|e| e.to_string())?;
    let next_id: i64 = prompts
        .iter()
        .filter_map(|p| p.id.parse().ok())
        .max()
        .map(|n: i64| n + 1)
        .unwrap_or(1);
    let now = now_iso();
    let new_prompt = Prompt {
        id: next_id.to_string(),
        title: title.trim().to_string(),
        content,
        created_at: now.clone(),
        updated_at: now,
    };
    prompts.push(new_prompt.clone());
    with_db(|conn| db::save_prompts(conn, &prompts))?;
    Ok(new_prompt)
}

#[tauri::command]
fn get_designs() -> Result<Vec<Design>, String> {
    with_db(db::get_designs)
}

#[tauri::command]
fn save_designs(designs: Vec<Design>) -> Result<(), String> {
    with_db(|conn| db::save_designs(conn, &designs))
}

#[tauri::command]
fn save_active_projects(projects: Vec<String>) -> Result<(), String> {
    with_db(|conn| db::save_active_projects(conn, &projects))
}

#[tauri::command]
fn get_current_project_id() -> Result<Option<String>, String> {
    with_db(db::get_current_project_id)
}

#[tauri::command]
fn set_current_project_id(project_id: String) -> Result<(), String> {
    with_db(|conn| db::set_current_project_id(conn, &project_id))
}

#[tauri::command]
fn get_tickets() -> Result<Vec<Ticket>, String> {
    with_db(db::get_tickets)
}

#[tauri::command]
fn save_tickets(tickets: Vec<Ticket>) -> Result<(), String> {
    with_db(|conn| db::save_tickets(conn, &tickets))
}

#[tauri::command]
fn get_features() -> Result<Vec<Feature>, String> {
    with_db(db::get_features)
}

#[tauri::command]
fn save_features(features: Vec<Feature>) -> Result<(), String> {
    with_db(|conn| db::save_features(conn, &features))
}

#[tauri::command]
fn get_kv_store_entries() -> Result<Vec<db::KvEntry>, String> {
    with_db(db::get_kv_store_entries)
}

/// Return the data directory path (from DB, ADR 069). Used by UI to show where data is stored.
#[tauri::command]
fn get_data_dir() -> Result<String, String> {
    resolve_data_dir().map(|p| p.to_string_lossy().to_string())
}

/// Path to february-dir.txt (one path per line = project roots). In dev: repo data dir; when bundled: app data dir so the built app can find config.
#[tauri::command]
fn get_february_dir_config_path() -> Result<String, String> {
    data_root().map(|d| d.join("february-dir.txt").to_string_lossy().to_string())
}

/// Aggregated counts for the dashboard metrics view.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardMetrics {
    pub tickets_count: u32,
    pub features_count: u32,
    pub prompts_count: u32,
    pub designs_count: u32,
    pub active_projects_count: u32,
    pub all_projects_count: u32,
}

#[tauri::command]
fn get_dashboard_metrics() -> Result<DashboardMetrics, String> {
    with_db(|conn| {
        let tickets = db::get_tickets(conn)?;
        let features = db::get_features(conn)?;
        let prompts = db::get_prompts(conn)?;
        let designs = db::get_designs(conn)?;
        let active = db::get_active_projects(conn)?;
        // Use actual projects list count (from kv "projects"), not "all_projects" kv
        let all_projects = list_projects_impl(conn)?;
        Ok(DashboardMetrics {
            tickets_count: tickets.len() as u32,
            features_count: features.len() as u32,
            prompts_count: prompts.len() as u32,
            designs_count: designs.len() as u32,
            active_projects_count: active.len() as u32,
            all_projects_count: all_projects.len() as u32,
        })
    })
}

fn run_script_inner(
    app: AppHandle,
    state: State<'_, RunningState>,
    ws: PathBuf,
    run_id: String,
    run_label: String,
    prompt_ids: Vec<u32>,
    combined_prompt: Option<String>,
    active_projects: Vec<String>,
    timing: TimingParams,
) -> Result<(), String> {
    let run_label_clone = run_label.clone();
    let script = script_path(&ws);
    if !script.exists() {
        return Err(format!(
            "Run prompts script not found: {}",
            script.to_string_lossy()
        ));
    }
    let prompt_ids_str: Vec<String> = prompt_ids.iter().map(|n| n.to_string()).collect();

    let data = resolve_data_dir()?;
    let projects_file: PathBuf = if active_projects.is_empty() {
        data.join("cursor_projects.json")
    } else {
        let tmp = std::env::temp_dir().join(format!("run_prompts_{}.json", run_id));
        let content =
            serde_json::to_string_pretty(&active_projects).map_err(|e| e.to_string())?;
        std::fs::write(&tmp, content).map_err(|e| e.to_string())?;
        tmp
    };

    let prompt_file_path: Option<PathBuf> = match combined_prompt {
        Some(content) => {
            let tmp = std::env::temp_dir().join(format!("run_combined_prompt_{}.txt", run_id));
            std::fs::write(&tmp, content).map_err(|e| e.to_string())?;
            Some(tmp)
        }
        None => None,
    };

    let mut cmd = Command::new("bash");
    cmd.arg(script.as_os_str());
    if let Some(ref path) = prompt_file_path {
        cmd.arg("-F").arg(path.as_os_str());
    } else {
        cmd.arg("-p").args(&prompt_ids_str);
    }
    cmd.arg(projects_file.as_os_str())
        .current_dir(&ws)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(unix)]
    cmd.process_group(0);
    cmd.env("SLEEP_AFTER_OPEN_PROJECT", timing.sleep_after_open_project.to_string())
        .env("SLEEP_AFTER_WINDOW_FOCUS", timing.sleep_after_window_focus.to_string())
        .env("SLEEP_BETWEEN_SHIFT_TABS", timing.sleep_between_shift_tabs.to_string())
        .env("SLEEP_AFTER_ALL_SHIFT_TABS", timing.sleep_after_all_shift_tabs.to_string())
        .env("SLEEP_AFTER_CMD_N", timing.sleep_after_cmd_n.to_string())
        .env("SLEEP_BEFORE_PASTE", timing.sleep_before_paste.to_string())
        .env("SLEEP_AFTER_PASTE", timing.sleep_after_paste.to_string())
        .env("SLEEP_AFTER_ENTER", timing.sleep_after_enter.to_string())
        .env("SLEEP_BETWEEN_PROJECTS", timing.sleep_between_projects.to_string())
        .env("SLEEP_BETWEEN_ROUNDS", timing.sleep_between_rounds.to_string());

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;

    {
        let mut guard = state.runs.lock().map_err(|e| e.to_string())?;
        guard.insert(
            run_id.clone(),
            RunEntry {
                child,
                label: run_label.clone(),
            },
        );
    }

    let app_stdout = app.clone();
    let app_stderr = app.clone();
    let app_exited = app.clone();
    let runs_handle = Arc::clone(&state.runs);
    let run_id_stdout = run_id.clone();
    let run_id_stderr = run_id.clone();
    let run_id_exited = run_id.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_stdout.emit(
                    "script-log",
                    ScriptLogPayload {
                        run_id: run_id_stdout.clone(),
                        line,
                    },
                );
            }
        }
    });
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_stderr.emit(
                    "script-log",
                    ScriptLogPayload {
                        run_id: run_id_stderr.clone(),
                        line: format!("[stderr] {}", line),
                    },
                );
            }
        }
    });
    thread::spawn(move || {
        loop {
            let exit_code_to_emit: Option<Option<i32>> = {
                let mut guard = match runs_handle.lock() {
                    Ok(g) => g,
                    Err(_) => break,
                };
                if let Some(entry) = guard.get_mut(&run_id_exited) {
                    if let Some(status) = entry.child.try_wait().ok().flatten() {
                        let code = status.code();
                        guard.remove(&run_id_exited);
                        Some(code)
                    } else {
                        None
                    }
                } else {
                    break;
                }
            };
            if let Some(exit_code) = exit_code_to_emit {
                let _ = app_exited.emit(
                    "script-exited",
                    ScriptExitedPayload {
                        run_id: run_id_exited,
                        label: run_label_clone.clone(),
                        exit_code,
                    },
                );
                break;
            }
            thread::sleep(std::time::Duration::from_millis(500));
        }
    });

    Ok(())
}

fn run_analysis_script_inner(
    app: AppHandle,
    state: State<'_, RunningState>,
    ws: PathBuf,
    run_id: String,
    run_label: String,
    project_path: String,
) -> Result<(), String> {
    let run_label_clone = run_label.clone();
    let script = analysis_script_path(&ws);
    if !script.exists() {
        return Err(format!(
            "Analysis script not found: {}",
            script.to_string_lossy()
        ));
    }
    let mut cmd = Command::new("bash");
    cmd.arg(script.as_os_str())
        .arg("-P")
        .arg(project_path.as_str())
        .current_dir(&ws)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(unix)]
    cmd.process_group(0);

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;

    {
        let mut guard = state.runs.lock().map_err(|e| e.to_string())?;
        guard.insert(
            run_id.clone(),
            RunEntry {
                child,
                label: run_label.clone(),
            },
        );
    }

    let app_stdout = app.clone();
    let app_stderr = app.clone();
    let app_exited = app.clone();
    let runs_handle = Arc::clone(&state.runs);
    let run_id_stdout = run_id.clone();
    let run_id_stderr = run_id.clone();
    let run_id_exited = run_id.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_stdout.emit(
                    "script-log",
                    ScriptLogPayload {
                        run_id: run_id_stdout.clone(),
                        line,
                    },
                );
            }
        }
    });
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_stderr.emit(
                    "script-log",
                    ScriptLogPayload {
                        run_id: run_id_stderr.clone(),
                        line: format!("[stderr] {}", line),
                    },
                );
            }
        }
    });
    thread::spawn(move || {
        loop {
            let exit_code_to_emit: Option<Option<i32>> = {
                let mut guard = match runs_handle.lock() {
                    Ok(g) => g,
                    Err(_) => break,
                };
                if let Some(entry) = guard.get_mut(&run_id_exited) {
                    if let Some(status) = entry.child.try_wait().ok().flatten() {
                        let code = status.code();
                        guard.remove(&run_id_exited);
                        Some(code)
                    } else {
                        None
                    }
                } else {
                    break;
                }
            };
            if let Some(exit_code) = exit_code_to_emit {
                let _ = app_exited.emit(
                    "script-exited",
                    ScriptExitedPayload {
                        run_id: run_id_exited,
                        label: run_label_clone.clone(),
                        exit_code,
                    },
                );
                break;
            }
            thread::sleep(std::time::Duration::from_millis(500));
        }
    });

    Ok(())
}

fn run_implement_all_script_inner(
    app: AppHandle,
    state: State<'_, RunningState>,
    ws: PathBuf,
    run_id: String,
    run_label: String,
    project_path: String,
    slot: Option<u8>,
    prompt_content: Option<String>,
) -> Result<(), String> {
    let run_label_clone = run_label.clone();
    let script = implement_all_script_path(&ws);
    if !script.exists() {
        return Err(format!(
            "Implement All script not found: {}",
            script.to_string_lossy()
        ));
    }
    let prompt_path: Option<PathBuf> = match &prompt_content {
        Some(content) => {
            let p = std::env::temp_dir().join(format!("kw_implement_all_prompt_{}.txt", run_id));
            std::fs::write(&p, content).map_err(|e| e.to_string())?;
            Some(p)
        }
        None => None,
    };
    let mut cmd = Command::new("bash");
    cmd.arg(script.as_os_str())
        .arg("-P")
        .arg(project_path.as_str());
    if let Some(s) = slot {
        if (1..=20).contains(&s) {
            cmd.arg("-S").arg(s.to_string());
        }
    }
    if let Some(ref path) = prompt_path {
        cmd.arg("-F").arg(path.as_os_str());
    }
    cmd.current_dir(&ws)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(unix)]
    cmd.process_group(0);

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;

    {
        let mut guard = state.runs.lock().map_err(|e| e.to_string())?;
        guard.insert(
            run_id.clone(),
            RunEntry {
                child,
                label: run_label.clone(),
            },
        );
    }

    let app_stdout = app.clone();
    let app_stderr = app.clone();
    let app_exited = app.clone();
    let runs_handle = Arc::clone(&state.runs);
    let run_id_stdout = run_id.clone();
    let run_id_stderr = run_id.clone();
    let run_id_exited = run_id.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_stdout.emit(
                    "script-log",
                    ScriptLogPayload {
                        run_id: run_id_stdout.clone(),
                        line,
                    },
                );
            }
        }
    });
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_stderr.emit(
                    "script-log",
                    ScriptLogPayload {
                        run_id: run_id_stderr.clone(),
                        line: format!("[stderr] {}", line),
                    },
                );
            }
        }
    });
    thread::spawn(move || {
        loop {
            let exit_code_to_emit: Option<Option<i32>> = {
                let mut guard = match runs_handle.lock() {
                    Ok(g) => g,
                    Err(_) => break,
                };
                if let Some(entry) = guard.get_mut(&run_id_exited) {
                    if let Some(status) = entry.child.try_wait().ok().flatten() {
                        let code = status.code();
                        guard.remove(&run_id_exited);
                        Some(code)
                    } else {
                        None
                    }
                } else {
                    break;
                }
            };
            if let Some(exit_code) = exit_code_to_emit {
                let _ = app_exited.emit(
                    "script-exited",
                    ScriptExitedPayload {
                        run_id: run_id_exited,
                        label: run_label_clone.clone(),
                        exit_code,
                    },
                );
                break;
            }
            thread::sleep(std::time::Duration::from_millis(500));
        }
    });

    Ok(())
}

/// Single-prompt terminal agent run (debug "Run terminal agent to fix", Setup prompt, temp ticket, etc.).
/// Uses script/run_terminal_agent.sh (from repo ws or from app bundle resources). Not used for Implement All.
fn run_run_terminal_agent_script_inner(
    app: AppHandle,
    state: State<'_, RunningState>,
    script_path: PathBuf,
    current_dir: PathBuf,
    run_id: String,
    run_label: String,
    project_path: String,
    prompt_content: String,
    agent_mode: Option<String>,
) -> Result<(), String> {
    let run_label_clone = run_label.clone();
    if !script_path.exists() {
        return Err(format!(
            "Run terminal agent script not found: {}",
            script_path.to_string_lossy()
        ));
    }
    // Write prompt file inside the project dir so the script (and sandboxed child) can always read it.
    let p = Path::new(&project_path).join(format!(".kwdev_run_prompt_{}.txt", run_id));
    std::fs::write(&p, &prompt_content).map_err(|e| format!("Failed to write prompt file in project: {}", e))?;
    // #region agent log
    session_log_c29a12(
        "lib.rs:run_run_terminal_agent_script_inner",
        "prompt file written",
        &[("prompt_path", &p.display().to_string()), ("prompt_len", &format!("{}", prompt_content.len()))],
        "H4",
    );
    session_log_415745(
        "lib.rs:run_run_terminal_agent_script_inner",
        "prompt file written, about to spawn",
        &[
            ("prompt_path", &p.display().to_string()),
            ("prompt_len", &format!("{}", prompt_content.len())),
            ("agent_mode", &agent_mode.clone().unwrap_or_default()),
            ("script_path", &script_path.display().to_string()),
        ],
        "H3",
    );
    // #endregion
    let mut cmd = Command::new("bash");
    cmd.arg(script_path.as_os_str())
        .arg("-P")
        .arg(project_path.as_str())
        .arg("-F")
        .arg(p.as_os_str());
    if let Some(m) = agent_mode.as_ref().filter(|s| !s.is_empty()) {
        if m != "agent" {
            cmd.arg("-M").arg(m);
        }
    }
    cmd.current_dir(&current_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    // GUI apps (e.g. launched from Desktop) get a minimal PATH; extend so `agent` and other CLIs are found
    if let Ok(home) = std::env::var("HOME") {
        let extra = format!("{}/.local/bin:/usr/local/bin", home);
        let path = std::env::var_os("PATH").unwrap_or_default();
        let new_path = if path.is_empty() {
            extra
        } else {
            format!("{}:{}", extra, path.to_string_lossy())
        };
        cmd.env("PATH", new_path);
    }
    #[cfg(unix)]
    cmd.process_group(0);

    let mut child = match cmd.spawn() {
        Ok(c) => {
            session_log_c29a12("lib.rs:run_run_terminal_agent_script_inner", "spawn ok", &[], "H5");
            session_log_415745("lib.rs:run_run_terminal_agent_script_inner", "spawn ok", &[("run_id", &run_id)], "H5");
            c
        }
        Err(e) => {
            let err_s = e.to_string();
            session_log_c29a12("lib.rs:run_run_terminal_agent_script_inner", "spawn failed", &[("error", &err_s)], "H5");
            session_log_415745("lib.rs:run_run_terminal_agent_script_inner", "spawn failed", &[("error", &err_s)], "H5");
            return Err(err_s);
        }
    };
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;

    {
        let mut guard = state.runs.lock().map_err(|e| e.to_string())?;
        guard.insert(
            run_id.clone(),
            RunEntry {
                child,
                label: run_label.clone(),
            },
        );
    }

    let app_stdout = app.clone();
    let app_stderr = app.clone();
    let app_exited = app.clone();
    let runs_handle = Arc::clone(&state.runs);
    let run_id_stdout = run_id.clone();
    let run_id_stderr = run_id.clone();
    let run_id_exited = run_id.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_stdout.emit(
                    "script-log",
                    ScriptLogPayload {
                        run_id: run_id_stdout.clone(),
                        line,
                    },
                );
            }
        }
    });
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_stderr.emit(
                    "script-log",
                    ScriptLogPayload {
                        run_id: run_id_stderr.clone(),
                        line: format!("[stderr] {}", line),
                    },
                );
            }
        }
    });
    thread::spawn(move || {
        loop {
            let exit_code_to_emit: Option<Option<i32>> = {
                let mut guard = match runs_handle.lock() {
                    Ok(g) => g,
                    Err(_) => break,
                };
                if let Some(entry) = guard.get_mut(&run_id_exited) {
                    if let Some(status) = entry.child.try_wait().ok().flatten() {
                        let code = status.code();
                        guard.remove(&run_id_exited);
                        Some(code)
                    } else {
                        None
                    }
                } else {
                    break;
                }
            };
            if let Some(exit_code) = exit_code_to_emit {
                let _ = app_exited.emit(
                    "script-exited",
                    ScriptExitedPayload {
                        run_id: run_id_exited,
                        label: run_label_clone.clone(),
                        exit_code,
                    },
                );
                break;
            }
            thread::sleep(std::time::Duration::from_millis(500));
        }
    });

    Ok(())
}

/// Opens 3 Terminal.app windows (macOS only), each running `cd project_path && agent`.
/// Gives you a real TTY so Cursor CLI runs in interactive mode instead of "print mode".
#[tauri::command]
async fn open_implement_all_in_system_terminal(project_path: String) -> Result<(), String> {
    #[cfg(not(target_os = "macos"))]
    {
        let _ = project_path;
        return Err("Open in system terminal is only supported on macOS.".to_string());
    }
    #[cfg(target_os = "macos")]
    {
        // Escape path for shell: single-quote wrap, inner ' → '\''
        let path_escaped = project_path.replace('\'', "'\\''");
        let shell_cmd = format!("cd '{}' && agent", path_escaped);
        // Escape for AppleScript string: \ → \\, " → \"
        let as_escaped = shell_cmd.replace('\\', "\\\\").replace('"', "\\\"");
        let script = format!(
            "tell application \"Terminal\" to do script \"{}\"",
            as_escaped
        );
        for _ in 0..3 {
            Command::new("osascript")
                .arg("-e")
                .arg(&script)
                .spawn()
                .map_err(|e| format!("Failed to open Terminal: {}", e))?;
        }
        Ok(())
    }
}

/// Opens Terminal.app (macOS) and runs `npm run <script_name>` in the project directory.
#[tauri::command]
async fn run_npm_script_in_external_terminal(project_path: String, script_name: String) -> Result<(), String> {
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (project_path, script_name);
        return Err("External terminal is only supported on macOS.".to_string());
    }
    #[cfg(target_os = "macos")]
    {
        if script_name.is_empty()
            || !script_name
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == ':')
        {
            return Err("Invalid script name: only letters, numbers, hyphen, underscore and colon allowed".to_string());
        }
        let dir = Path::new(&project_path)
            .canonicalize()
            .map_err(|e| format!("Project path invalid: {}", e))?;
        if !dir.is_dir() {
            return Err("Project path is not a directory".to_string());
        }
        let path_str = dir.to_string_lossy();
        let path_escaped = path_str.replace('\'', "'\\''");
        let shell_cmd = format!("cd '{}' && npm run {}", path_escaped, script_name);
        let as_escaped = shell_cmd.replace('\\', "\\\\").replace('"', "\\\"");
        let script = format!(
            "tell application \"Terminal\" to do script \"{}\"",
            as_escaped
        );
        Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .spawn()
            .map_err(|e| format!("Failed to open Terminal: {}", e))?;
        Ok(())
    }
}

/// Opens Terminal.app (macOS) and runs `npm run build:desktop` in the current working directory.
/// Use when running the app via `tauri dev` so the cwd is the project root.
#[tauri::command]
fn run_build_desktop() -> Result<(), String> {
    #[cfg(not(target_os = "macos"))]
    {
        return Err("Rebuild on desktop is only supported on macOS.".to_string());
    }
    #[cfg(target_os = "macos")]
    {
        let dir = std::env::current_dir().map_err(|e| format!("Could not get current directory: {}", e))?;
        let path_str = dir.to_string_lossy();
        let path_escaped = path_str.replace('\'', "'\\''");
        let shell_cmd = format!("cd '{}' && npm run build:desktop", path_escaped);
        let as_escaped = shell_cmd.replace('\\', "\\\\").replace('"', "\\\"");
        let script = format!(
            "tell application \"Terminal\" to do script \"{}\"",
            as_escaped
        );
        Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .spawn()
            .map_err(|e| format!("Failed to open Terminal: {}", e))?;
        Ok(())
    }
}

/// Opens one system terminal (Terminal.app on macOS) with the project path as the current working directory.
/// On non-macOS returns an error; same as open_implement_all_in_system_terminal and run_npm_script_in_external_terminal.
#[tauri::command]
fn open_project_in_system_terminal(project_path: String) -> Result<(), String> {
    #[cfg(not(target_os = "macos"))]
    {
        let _ = project_path;
        return Err("Open in terminal is only supported on macOS.".to_string());
    }
    #[cfg(target_os = "macos")]
    {
        let dir = Path::new(project_path.trim())
            .canonicalize()
            .map_err(|e| format!("Project path invalid: {}", e))?;
        if !dir.is_dir() {
            return Err("Project path is not a directory".to_string());
        }
        let path_str = dir.to_string_lossy();
        let path_escaped = path_str.replace('\'', "'\\''");
        let shell_cmd = format!("cd '{}'", path_escaped);
        let as_escaped = shell_cmd.replace('\\', "\\\\").replace('"', "\\\"");
        let script = format!(
            "tell application \"Terminal\" to do script \"{}\"",
            as_escaped
        );
        Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .spawn()
            .map_err(|e| format!("Failed to open Terminal: {}", e))?;
        Ok(())
    }
}

/// Opens a project directory in Cursor or Visual Studio Code.
/// `editor` must be "cursor" or "vscode". On macOS uses `open -a "Cursor" path` / `open -a "Visual Studio Code" path`;
/// on Windows/Linux spawns the editor CLI with the path (cursor/code in PATH when installed).
#[tauri::command]
fn open_project_in_editor(project_path: String, editor: String) -> Result<(), String> {
    let path = project_path.trim();
    if path.is_empty() {
        return Err("Project path is empty".to_string());
    }
    let dir = Path::new(path)
        .canonicalize()
        .map_err(|e| format!("Invalid project path: {}", e))?;
    if !dir.is_dir() {
        return Err("Project path is not a directory".to_string());
    }
    let path_str = dir.to_string_lossy();
    let editor_lower = editor.trim().to_lowercase();

    #[cfg(target_os = "macos")]
    {
        let (app_name, label) = match editor_lower.as_str() {
            "cursor" => ("Cursor", "Cursor"),
            "vscode" | "code" => ("Visual Studio Code", "VS Code"),
            _ => return Err(format!("Unknown editor '{}'. Use 'cursor' or 'vscode'.", editor.trim())),
        };
        Command::new("open")
            .arg("-a")
            .arg(app_name)
            .arg(path_str.as_ref())
            .spawn()
            .map_err(|e| format!("Failed to open in {}: {}", label, e))?;
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        let (bin, label) = match editor_lower.as_str() {
            "cursor" => ("cursor", "Cursor"),
            "vscode" | "code" => ("code", "VS Code"),
            _ => return Err(format!("Unknown editor '{}'. Use 'cursor' or 'vscode'.", editor.trim())),
        };
        Command::new(bin)
            .arg(path_str.as_ref())
            .spawn()
            .map_err(|e| format!("Failed to open in {}: {}. Is {} installed and in PATH?", label, e, label))?;
        Ok(())
    }
}

/// Opens the given directory in the system file manager (Finder on macOS, Explorer on Windows, xdg-open on Linux).
/// Caller must ensure `dir` exists and is a directory.
fn open_dir_in_file_manager(dir: &Path) -> Result<(), String> {
    let path_str = dir.to_string_lossy();

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path_str.as_ref())
            .spawn()
            .map_err(|e| format!("Failed to open in Finder: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        let path_win = path_str.replace('/', "\\");
        Command::new("explorer")
            .arg(&path_win)
            .spawn()
            .map_err(|e| format!("Failed to open in Explorer: {}", e))?;
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Command::new("xdg-open")
            .arg(path_str.as_ref())
            .spawn()
            .map_err(|e| format!("Failed to open in file manager: {}", e))?;
    }

    Ok(())
}

/// Opens the given path in the system file manager (Finder on macOS, Explorer on Windows, xdg-open on Linux).
#[tauri::command]
fn open_path_in_file_manager(path: String) -> Result<(), String> {
    let path = path.trim();
    if path.is_empty() {
        return Err("Path is empty".to_string());
    }
    let dir = Path::new(path)
        .canonicalize()
        .map_err(|e| format!("Invalid path: {}", e))?;
    if !dir.is_dir() {
        return Err("Path is not a directory".to_string());
    }
    open_dir_in_file_manager(&dir)
}

/// Opens the app repo's .cursor/documentation folder (or .cursor if documentation subfolder is missing) in the system file manager.
#[tauri::command]
fn open_documentation_folder() -> Result<(), String> {
    let root = project_root()?;
    let doc_dir = root.join(".cursor").join("documentation");
    let cursor_dir = root.join(".cursor");
    let to_open = if doc_dir.is_dir() {
        doc_dir
    } else if cursor_dir.is_dir() {
        cursor_dir
    } else {
        return Err("Documentation folder (.cursor/documentation or .cursor) not found.".to_string());
    };
    open_dir_in_file_manager(&to_open)
}

/// Returns the app repo's .cursor/documentation folder path (or .cursor if documentation subfolder is missing). Used for copy-to-clipboard (ADR 0215).
#[tauri::command]
fn get_documentation_folder_path() -> Result<String, String> {
    let root = project_root()?;
    let doc_dir = root.join(".cursor").join("documentation");
    let cursor_dir = root.join(".cursor");
    let to_open = if doc_dir.is_dir() {
        doc_dir
    } else if cursor_dir.is_dir() {
        cursor_dir
    } else {
        return Err("Documentation folder (.cursor/documentation or .cursor) not found.".to_string());
    };
    Ok(to_open.to_string_lossy().to_string())
}


/// Opens the app repo's .cursor/0. ideas folder (or .cursor if that subfolder is missing) in the system file manager.
#[tauri::command]
fn open_ideas_folder() -> Result<(), String> {
    let root = project_root()?;
    let ideas_dir = root.join(".cursor").join("0. ideas");
    let cursor_dir = root.join(".cursor");
    let to_open = if ideas_dir.is_dir() {
        ideas_dir
    } else if cursor_dir.is_dir() {
        cursor_dir
    } else {
        return Err("Ideas folder (.cursor/0. ideas or .cursor) not found.".to_string());
    };
    open_dir_in_file_manager(&to_open)
}

/// Returns the path to the ideas folder (.cursor/0. ideas or .cursor) for clipboard copy (ADR 0219).
#[tauri::command]
fn get_ideas_folder_path() -> Result<String, String> {
    let root = project_root()?;
    let ideas_dir = root.join(".cursor").join("0. ideas");
    let cursor_dir = root.join(".cursor");
    let path = if ideas_dir.is_dir() {
        ideas_dir
    } else if cursor_dir.is_dir() {
        cursor_dir
    } else {
        return Err("Ideas folder (.cursor/0. ideas or .cursor) not found.".to_string());
    };
    Ok(path.to_string_lossy().to_string())
}

/// Opens the app repo's .cursor/7. planner folder (or .cursor if that subfolder is missing) in the system file manager.
#[tauri::command]
fn open_planner_folder() -> Result<(), String> {
    let root = project_root()?;
    let planner_dir = root.join(".cursor").join("7. planner");
    let cursor_dir = root.join(".cursor");
    let to_open = if planner_dir.is_dir() {
        planner_dir
    } else if cursor_dir.is_dir() {
        cursor_dir
    } else {
        return Err("Planner folder (.cursor/7. planner or .cursor) not found.".to_string());
    };
    open_dir_in_file_manager(&to_open)
}

/// Returns the app repo's .cursor/7. planner folder path (or .cursor if that subfolder is missing). Used for copy-to-clipboard.
#[tauri::command]
fn get_planner_folder_path() -> Result<String, String> {
    let root = project_root()?;
    let planner_dir = root.join(".cursor").join("7. planner");
    let cursor_dir = root.join(".cursor");
    let path = if planner_dir.is_dir() {
        planner_dir
    } else if cursor_dir.is_dir() {
        cursor_dir
    } else {
        return Err("Planner folder (.cursor/7. planner or .cursor) not found.".to_string());
    };
    Ok(path.to_string_lossy().to_string())
}

/// Opens the app repo's .cursor/milestones folder (or .cursor if that subfolder is missing) in the system file manager.
#[tauri::command]
fn open_milestones_folder() -> Result<(), String> {
    let root = project_root()?;
    let milestones_dir = root.join(".cursor").join("milestones");
    let cursor_dir = root.join(".cursor");
    let to_open = if milestones_dir.is_dir() {
        milestones_dir
    } else if cursor_dir.is_dir() {
        cursor_dir
    } else {
        return Err("Milestones folder (.cursor/milestones or .cursor) not found.".to_string());
    };
    open_dir_in_file_manager(&to_open)
}

/// Returns the app repo's .cursor/milestones folder path (or .cursor if that subfolder is missing). Used for copy-to-clipboard.
#[tauri::command]
fn get_milestones_folder_path() -> Result<String, String> {
    let root = project_root()?;
    let milestones_dir = root.join(".cursor").join("milestones");
    let cursor_dir = root.join(".cursor");
    let path = if milestones_dir.is_dir() {
        milestones_dir
    } else if cursor_dir.is_dir() {
        cursor_dir
    } else {
        return Err("Milestones folder (.cursor/milestones or .cursor) not found.".to_string());
    };
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
async fn run_implement_all(
    app: AppHandle,
    state: State<'_, RunningState>,
    project_path: String,
    slot: Option<u8>,
    prompt_content: Option<String>,
) -> Result<RunIdResponse, String> {
    let ws = project_root()?;
    let run_id = gen_run_id();
    let label = match slot {
        Some(n) if (1..=20).contains(&n) => format!("Implement All (Terminal {})", n),
        _ => "Implement All".to_string(),
    };
    run_implement_all_script_inner(app, state, ws, run_id.clone(), label, project_path, slot, prompt_content)?;
    Ok(RunIdResponse { run_id })
}

/// One tool entry for run_static_analysis_checklist (from frontend STATIC_ANALYSIS_CHECKLIST).
#[derive(serde::Deserialize)]
struct StaticAnalysisToolArg {
    id: String,
    name: String,
    category: String,
    #[serde(alias = "installCommand")]
    install_command: String,
    #[serde(alias = "runCommand")]
    run_command: String,
    #[serde(default)]
    optional: bool,
}

/// Runs the static analysis checklist by executing each tool's install/run in the project dir.
/// Emits script-log and script-exited so the same terminal UI shows output. No agent involved.
#[tauri::command]
async fn run_static_analysis_checklist(
    app: AppHandle,
    project_path: String,
    tools: Vec<StaticAnalysisToolArg>,
) -> Result<RunIdResponse, String> {
    let project_path = project_path.trim().to_string();
    if project_path.is_empty() {
        return Err("Project path is required.".to_string());
    }
    let dir = Path::new(&project_path)
        .canonicalize()
        .map_err(|e| format!("Project path invalid: {}", e))?;
    if !dir.is_dir() {
        return Err(format!(
            "Project path is not a directory or does not exist: {}",
            project_path
        ));
    }
    let run_id = gen_run_id();
    let label = "Static analysis checklist".to_string();
    let report_path = dir.join("analysis-report.txt");
    let app_emit = app.clone();
    let run_id_emit = run_id.clone();
    let label_emit = label.clone();
    thread::spawn(move || {
        let mut report_content = String::new();
        let header = format!(
            "Static analysis report — {}\nGenerated at repo root (direct run).\n\n",
            project_path
        );
        if let Err(e) = std::fs::write(&report_path, &header) {
            let _ = app_emit.emit(
                "script-log",
                ScriptLogPayload {
                    run_id: run_id_emit.clone(),
                    line: format!("[error] Failed to create report: {}", e),
                },
            );
        } else {
            report_content.push_str(&header);
        }
        let has_backend = dir.join("backend").is_dir();
        let has_frontend = dir.join("frontend").is_dir();
        let mut succeeded = 0u32;
        for tool in &tools {
            if tool.category.eq_ignore_ascii_case("backend") && !has_backend {
                let _ = app_emit.emit(
                    "script-log",
                    ScriptLogPayload {
                        run_id: run_id_emit.clone(),
                        line: format!("--- {} --- [skipped: no backend/]", tool.name),
                    },
                );
                report_content.push_str(&format!(
                    "\n### {} (id: {})\nSkipped: project has no backend/ (frontend-only, e.g. Next.js).\n",
                    tool.name, tool.id
                ));
                continue;
            }
            let run_command = if tool.category.eq_ignore_ascii_case("both") && !has_backend {
                tool.run_command.replace(" backend/", "").replace("backend/", "")
            } else {
                tool.run_command.clone()
            };
            let (run_command, install_command) = if !has_frontend
                && (run_command.starts_with("cd frontend && ") || tool.install_command.starts_with("cd frontend && "))
            {
                let run = run_command
                    .strip_prefix("cd frontend && ")
                    .unwrap_or(&run_command)
                    .to_string();
                let install = tool
                    .install_command
                    .strip_prefix("cd frontend && ")
                    .unwrap_or(tool.install_command.as_str())
                    .to_string();
                (run, install)
            } else {
                (run_command, tool.install_command.clone())
            };
            let section_header = format!("\n### {} (id: {})\n", tool.name, tool.id);
            let _ = app_emit.emit(
                "script-log",
                ScriptLogPayload {
                    run_id: run_id_emit.clone(),
                    line: format!("--- {} ---", tool.name),
                },
            );
            let run_install = !install_command.is_empty()
                && !install_command.eq_ignore_ascii_case("already in project")
                && !install_command.to_lowercase().starts_with("same as");
            if run_install {
                let out = Command::new("sh")
                    .arg("-c")
                    .arg(&install_command)
                    .current_dir(&dir)
                    .output();
                match out {
                    Ok(o) => {
                        let _ = app_emit.emit(
                            "script-log",
                            ScriptLogPayload {
                                run_id: run_id_emit.clone(),
                                line: format!("[install] exit {}", o.status.code().unwrap_or(-1)),
                            },
                        );
                    }
                    Err(e) => {
                        let _ = app_emit.emit(
                            "script-log",
                            ScriptLogPayload {
                                run_id: run_id_emit.clone(),
                                line: format!("[install] error: {}", e),
                            },
                        );
                    }
                }
            }
            let out = Command::new("sh")
                .arg("-c")
                .arg(&run_command)
                .current_dir(&dir)
                .output();
            match out {
                Ok(o) => {
                    let stdout = String::from_utf8_lossy(&o.stdout);
                    let stderr = String::from_utf8_lossy(&o.stderr);
                    let code = o.status.code().unwrap_or(-1);
                    for line in stdout.lines() {
                        let _ = app_emit.emit(
                            "script-log",
                            ScriptLogPayload {
                                run_id: run_id_emit.clone(),
                                line: line.to_string(),
                            },
                        );
                    }
                    for line in stderr.lines() {
                        let _ = app_emit.emit(
                            "script-log",
                            ScriptLogPayload {
                                run_id: run_id_emit.clone(),
                                line: format!("[stderr] {}", line),
                            },
                        );
                    }
                    let _ = app_emit.emit(
                        "script-log",
                        ScriptLogPayload {
                            run_id: run_id_emit.clone(),
                            line: format!("[exit {}]", code),
                        },
                    );
                    if code == 0 {
                        succeeded += 1;
                    }
                    report_content.push_str(&section_header);
                    report_content.push_str(&format!("install: {}\nrun: {}\n", install_command, run_command));
                    report_content.push_str("--- stdout ---\n");
                    report_content.push_str(&stdout);
                    if !stderr.is_empty() {
                        report_content.push_str("--- stderr ---\n");
                        report_content.push_str(&stderr);
                    }
                    report_content.push_str(&format!("\n--- exit code: {} ---\n", code));
                }
                Err(e) => {
                    let err_line = format!("[error] {}", e);
                    let _ = app_emit.emit(
                        "script-log",
                        ScriptLogPayload {
                            run_id: run_id_emit.clone(),
                            line: err_line.clone(),
                        },
                    );
                    report_content.push_str(&section_header);
                    report_content.push_str(&format!("run: {}\n", run_command));
                    report_content.push_str(&format!("Error: {}\n", e));
                }
            }
        }
        report_content.push_str(&format!("\n\nSummary: {} tools succeeded of {}.\n", succeeded, tools.len()));
        let _ = std::fs::write(&report_path, &report_content);
        let _ = app_emit.emit(
            "script-log",
            ScriptLogPayload {
                run_id: run_id_emit.clone(),
                line: format!("Report written to {}", report_path.display()),
            },
        );
        let _ = app_emit.emit(
            "script-exited",
            ScriptExitedPayload {
                run_id: run_id_emit,
                label: label_emit,
                exit_code: Some(0),
            },
        );
    });
    Ok(RunIdResponse { run_id })
}

/// Args for run_run_terminal_agent; accept camelCase from frontend (projectPath, promptContent, label, agentMode, provider).
#[derive(serde::Deserialize)]
struct RunTerminalAgentArgs {
    #[serde(alias = "projectPath")]
    project_path: String,
    #[serde(alias = "promptContent")]
    prompt_content: String,
    label: String,
    /// Cursor CLI mode: ask | plan | debug. Omit or "agent" = normal.
    #[serde(alias = "agentMode")]
    agent_mode: Option<String>,
    /// Agent provider: "cursor" (default) or "claude". Selects which CLI script to run.
    provider: Option<String>,
}

#[tauri::command]
async fn run_run_terminal_agent(
    app: AppHandle,
    state: State<'_, RunningState>,
    args: RunTerminalAgentArgs,
) -> Result<RunIdResponse, String> {
    let RunTerminalAgentArgs {
        project_path,
        prompt_content,
        label,
        agent_mode,
        provider,
    } = args;
    let project_path = project_path.trim();
    if project_path.is_empty() {
        return Err("Project path is required.".to_string());
    }
    let project_path_buf = PathBuf::from(project_path);
    if !project_path_buf.is_dir() {
        return Err(format!(
            "Project path is not a directory or does not exist: {}",
            project_path
        ));
    }
    let project_path = project_path.to_string();
    // #region agent log
    session_log_c29a12(
        "lib.rs:run_run_terminal_agent",
        "command entry",
        &[("project_path_len", &format!("{}", project_path.len())), ("label", &label)],
        "H2",
    );
    session_log_415745(
        "lib.rs:run_run_terminal_agent",
        "command entry",
        &[("project_path", &project_path), ("label", &label), ("agent_mode", &agent_mode.clone().unwrap_or_default())],
        "H1",
    );
    // #endregion
    let run_id = gen_run_id();
    let run_label = if label.trim().is_empty() {
        "Terminal agent".to_string()
    } else {
        label.trim().to_string()
    };
    let (script_path, current_dir) = match project_root() {
        Ok(ws) => {
            let sp = match provider.as_deref() {
                Some("claude") => run_claude_agent_script_path(&ws),
                Some("gemini") => run_gemini_agent_script_path(&ws),
                _ => run_terminal_agent_script_path(&ws),
            };
            (sp, ws)
        }
        Err(_) => {
            let script_name = match provider.as_deref() {
                Some("claude") => "run_claude_agent.sh",
                Some("gemini") => "run_gemini_agent.sh",
                _ => "run_terminal_agent.sh",
            };
            let resource = app
                .path()
                .resolve(script_name, BaseDirectory::Resource)
                .map_err(|e| format!("Worker script not found in app bundle: {}", e))?;
            let dir = resource
                .parent()
                .map(|p| p.to_path_buf())
                .unwrap_or_else(std::env::temp_dir);
            (resource, dir)
        }
    };
    // #region agent log
    session_log_c29a12(
        "lib.rs:run_run_terminal_agent",
        "script_path resolved",
        &[
            ("script_path", &script_path.to_string_lossy()),
            ("script_exists", &format!("{}", script_path.exists())),
            ("current_dir", &current_dir.to_string_lossy()),
        ],
        "H3",
    );
    // #endregion
    run_run_terminal_agent_script_inner(
        app,
        state,
        script_path,
        current_dir,
        run_id.clone(),
        run_label,
        project_path,
        prompt_content,
        agent_mode,
    )?;
    Ok(RunIdResponse { run_id })
}

#[tauri::command]
async fn run_analysis_script(
    app: AppHandle,
    state: State<'_, RunningState>,
    project_path: String,
) -> Result<RunIdResponse, String> {
    let ws = project_root()?;
    let run_id = gen_run_id();
    let label = format!("Analysis: {}", Path::new(&project_path).file_name().and_then(|n| n.to_str()).unwrap_or("project"));
    run_analysis_script_inner(app, state, ws, run_id.clone(), label, project_path)?;
    Ok(RunIdResponse { run_id })
}

fn run_npm_script_inner(
    app: AppHandle,
    state: State<'_, RunningState>,
    run_id: String,
    run_label: String,
    project_path: String,
    script_name: String,
) -> Result<(), String> {
    // Allow only safe script names (alphanumeric, hyphen, underscore, colon for e.g. dev:full)
    if script_name.is_empty()
        || !script_name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == ':')
    {
        return Err("Invalid script name: only letters, numbers, hyphen, underscore and colon allowed".to_string());
    }
    let dir = Path::new(&project_path)
        .canonicalize()
        .map_err(|e| format!("Project path invalid: {}", e))?;
    if !dir.is_dir() {
        return Err("Project path is not a directory".to_string());
    }

    let run_label_clone = run_label.clone();
    let mut cmd = Command::new("npm");
    cmd.arg("run")
        .arg(script_name.as_str())
        .current_dir(&dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(unix)]
    cmd.process_group(0);

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;

    {
        let mut guard = state.runs.lock().map_err(|e| e.to_string())?;
        guard.insert(
            run_id.clone(),
            RunEntry {
                child,
                label: run_label.clone(),
            },
        );
    }

    let app_stdout = app.clone();
    let app_stderr = app.clone();
    let app_exited = app.clone();
    let runs_handle = Arc::clone(&state.runs);
    let run_id_stdout = run_id.clone();
    let run_id_stderr = run_id.clone();
    let run_id_exited = run_id.clone();
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_stdout.emit(
                    "script-log",
                    ScriptLogPayload {
                        run_id: run_id_stdout.clone(),
                        line,
                    },
                );
            }
        }
    });
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_stderr.emit(
                    "script-log",
                    ScriptLogPayload {
                        run_id: run_id_stderr.clone(),
                        line: format!("[stderr] {}", line),
                    },
                );
            }
        }
    });
    thread::spawn(move || {
        loop {
            let exit_code_to_emit: Option<Option<i32>> = {
                let mut guard = match runs_handle.lock() {
                    Ok(g) => g,
                    Err(_) => break,
                };
                if let Some(entry) = guard.get_mut(&run_id_exited) {
                    if let Some(status) = entry.child.try_wait().ok().flatten() {
                        let code = status.code();
                        guard.remove(&run_id_exited);
                        Some(code)
                    } else {
                        None
                    }
                } else {
                    break;
                }
            };
            if let Some(exit_code) = exit_code_to_emit {
                let _ = app_exited.emit(
                    "script-exited",
                    ScriptExitedPayload {
                        run_id: run_id_exited,
                        label: run_label_clone.clone(),
                        exit_code,
                    },
                );
                break;
            }
            thread::sleep(std::time::Duration::from_millis(500));
        }
    });

    Ok(())
}

#[tauri::command]
async fn run_npm_script(
    app: AppHandle,
    state: State<'_, RunningState>,
    project_path: String,
    script_name: String,
) -> Result<RunIdResponse, String> {
    let run_id = gen_run_id();
    let label = format!("npm run {}", script_name);
    run_npm_script_inner(app, state, run_id.clone(), label, project_path, script_name)?;
    Ok(RunIdResponse { run_id })
}

#[tauri::command]
async fn run_script(
    app: AppHandle,
    state: State<'_, RunningState>,
    args: RunScriptArgs,
) -> Result<RunIdResponse, String> {
    let ws = project_root()?;
    if args.run_label.is_none() {
        save_active_projects(args.active_projects.clone())?;
    }
    let run_id = gen_run_id();
    let label = args
        .run_label
        .unwrap_or_else(|| "Manual run".to_string());
    run_script_inner(
        app,
        state,
        ws,
        run_id.clone(),
        label,
        args.prompt_ids,
        args.combined_prompt,
        args.active_projects,
        args.timing,
    )?;
    Ok(RunIdResponse { run_id })
}

#[tauri::command]
fn list_running_runs(state: State<'_, RunningState>) -> Result<Vec<RunningRunInfo>, String> {
    let guard = state.runs.lock().map_err(|e| e.to_string())?;
    Ok(guard
        .iter()
        .map(|(run_id, entry)| RunningRunInfo {
            run_id: run_id.clone(),
            label: entry.label.clone(),
        })
        .collect())
}

#[tauri::command]
fn stop_run(state: State<'_, RunningState>, run_id: String) -> Result<(), String> {
    let mut guard = state.runs.lock().map_err(|e| e.to_string())?;
    if let Some(mut entry) = guard.remove(&run_id) {
        let pid = entry.child.id() as i32;
        #[cfg(unix)]
        {
            let _ = unsafe { libc::kill(-pid, libc::SIGKILL) };
        }
        let _ = entry.child.kill();
    }
    Ok(())
}

#[tauri::command]
fn stop_script(state: State<'_, RunningState>) -> Result<(), String> {
    let mut guard = state.runs.lock().map_err(|e| e.to_string())?;
    for (_run_id, mut entry) in guard.drain() {
        let pid = entry.child.id() as i32;
        #[cfg(unix)]
        {
            let _ = unsafe { libc::kill(-pid, libc::SIGKILL) };
        }
        let _ = entry.child.kill();
    }
    Ok(())
}

#[tauri::command]
async fn git_clone(url: String, dest_dir: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["clone", url.as_str(), dest_dir.as_str()])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().plugin(tauri_plugin_dialog::init());
    #[cfg(target_os = "macos")]
    let builder = builder.plugin(tauri_plugin_macos_permissions::init());
    builder
        .manage(RunningState::default())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let app = window.app_handle();
                if let Some(state) = app.try_state::<RunningState>() {
                    if let Ok(mut guard) = state.runs.lock() {
                        for (_run_id, mut entry) in guard.drain() {
                            let pid = entry.child.id() as i32;
                            #[cfg(unix)]
                            {
                                let _ = unsafe { libc::kill(-pid, libc::SIGKILL) };
                            }
                            let _ = entry.child.kill();
                        }
                    }
                }
            }
        })
        .setup(|_app| {
            // Workaround for macOS/Tauri bug: WebView often shows white instead of devUrl.
            // 1) Load a local loader HTML first (shows "kwdev" then redirects to dev server).
            // 2) Retry navigating to app URL at 2s, 4s, 6s in case loader redirect fails.
            #[cfg(debug_assertions)]
            {
                session_log("lib.rs:setup", "tauri_dev_workaround_start", &[], "H4");
                session_log_8a3da1("lib.rs:setup", "tauri_dev_workaround_start", &[], "H3");
                let app_url = "http://127.0.0.1:4001/".to_string();
                let app_handle = _app.handle().clone();

                // Write loader to temp file so we can navigate to it (file:// works when devUrl fails).
                let loader_url = (|| -> Option<Url> {
                    let html = include_str!("../../public/tauri-load.html");
                    let temp = std::env::temp_dir().join("tauri-load.html");
                    std::fs::write(&temp, html).ok()?;
                    let path = temp.canonicalize().ok()?;
                    Url::from_file_path(path).ok()
                })();
                session_log("lib.rs:setup", "loader_url", &[("has_url", if loader_url.is_some() { "true" } else { "false" })], "H1");

                std::thread::spawn(move || {
                    // First: try to show loader (file://) so user sees something instead of white.
                    if let Some(ref url) = loader_url {
                        std::thread::sleep(std::time::Duration::from_millis(150));
                        let handle = app_handle.clone();
                        let load_url = url.clone();
                        let _ = app_handle.run_on_main_thread(move || {
                            let windows: Vec<_> = handle.webview_windows().into_iter().collect();
                            session_log("lib.rs:workaround", "loader_nav", &[("window_count", &windows.len().to_string())], "H2");
                                session_log_8a3da1("lib.rs:workaround", "loader_nav", &[("window_count", &windows.len().to_string())], "H3");
                            if let Some((_, w)) = windows.into_iter().next() {
                                let _ = w.navigate(load_url.as_str().parse().unwrap_or_else(|_| "http://127.0.0.1:4001/".parse().unwrap()));
                            }
                        });
                    }

                    // Fallback: force-navigate to dev server in case loader or initial load failed.
                    for attempt in 0..3 {
                        std::thread::sleep(std::time::Duration::from_millis(2000));
                        let handle = app_handle.clone();
                        let url = app_url.clone();
                        let _ = app_handle.run_on_main_thread(move || {
                            let windows: Vec<_> = handle.webview_windows().into_iter().collect();
                            session_log("lib.rs:workaround", "dev_nav", &[("window_count", &windows.len().to_string()), ("attempt", &attempt.to_string())], "H2");
                                session_log_8a3da1("lib.rs:workaround", "dev_nav", &[("window_count", &windows.len().to_string()), ("attempt", &attempt.to_string())], "H3");
                            if let Some((_, w)) = windows.into_iter().next() {
                                let _ = w.navigate(
                                    url.parse().unwrap_or_else(|_| "http://127.0.0.1:4001/".parse().unwrap()),
                                );
                                let js = format!("window.location.href = {}", serde_json::to_string(&url).unwrap_or_else(|_| "\"http://127.0.0.1:4001/\"".into()));
                                let _ = w.eval(&js);
                            }
                        });
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_file_as_base64,
            read_file_text,
            read_file_text_under_root,
            list_files_under_root,
            list_scripts,
            list_cursor_folder,
            get_cursor_init_template,
            unzip_project_template,
            unzip_cursor_init,
            write_spec_file,
            archive_cursor_file,
            get_git_info,
            get_git_head,
            get_git_diff_name_status,
            get_implementation_log_entries,
            get_project_tickets,
            get_project_kanban_state,
            get_project_milestones,
            create_plan_ticket,
            set_plan_kanban_state,
            update_plan_ticket,
            delete_plan_ticket,
            get_ideas_list,
            create_idea,
            delete_idea,
            improve_idea_for_project,
            create_project_milestone,
            delete_project_milestone,
            get_project_doc,
            set_project_doc,
            get_all_project_docs,
            get_project_config,
            set_project_config,
            get_all_project_configs,
            get_kv_value,
            set_kv_value,
            update_implementation_log_entry_status,
            append_implementation_log_entry,
            get_git_file_view,
            git_fetch,
            git_pull,
            git_push,
            git_commit,
            analyze_project_for_tickets,
            get_all_projects,
            list_projects,
            get_project,
            create_project,
            update_project,
            delete_project,
            get_project_resolved,
            get_project_export,
            list_february_folders,
            list_february_folders_debug,
            list_february_folders_debug_entries,
            get_active_projects,
            get_prompts,
            save_prompts,
            add_prompt,
            get_designs,
            save_designs,
            save_active_projects,
            get_current_project_id,
            set_current_project_id,
            get_tickets,
            save_tickets,
            get_features,
            save_features,
            run_script,
            run_analysis_script,
            run_npm_script,
            run_npm_script_in_external_terminal,
            run_build_desktop,
            run_implement_all,
            run_run_terminal_agent,
            run_static_analysis_checklist,
            open_implement_all_in_system_terminal,
            open_project_in_system_terminal,
            open_project_in_editor,
            open_path_in_file_manager,
            open_documentation_folder,
            get_documentation_folder_path,
            open_ideas_folder,
            get_ideas_folder_path,
            open_planner_folder,
            get_planner_folder_path,
            open_milestones_folder,
            get_milestones_folder_path,
            list_running_runs,
            stop_run,
            stop_script,
            get_kv_store_entries,
            get_data_dir,
            get_february_dir_config_path,
            get_dashboard_metrics,
            frontend_debug_log,
            get_app_version,
            navigate_webview_to,
            fetch_url,
            git_clone
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}