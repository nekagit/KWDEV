//! Plan tickets and kanban state per project (Worker/Planner tab).

use rusqlite::Connection;

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

pub fn get_plan_tickets_for_project(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<serde_json::Value>, String> {
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

pub fn get_plan_kanban_state_for_project(
    conn: &Connection,
    project_id: &str,
) -> Result<serde_json::Value, String> {
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

pub fn delete_plan_ticket(
    conn: &Connection,
    project_id: &str,
    ticket_id: &str,
) -> Result<(), String> {
    let project_id = project_id.trim();
    let ticket_id = ticket_id.trim();
    let updated = conn
        .execute(
            "DELETE FROM plan_tickets WHERE id = ?1 AND project_id = ?2",
            rusqlite::params![ticket_id, project_id],
        )
        .map_err(|e| e.to_string())?;
    if updated == 0 {
        return Err("Ticket not found".to_string());
    }
    Ok(())
}

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
