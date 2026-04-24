//! Milestones and ideas per project.

use rusqlite::Connection;

pub fn get_milestones_for_project(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<serde_json::Value>, String> {
    let project_id = project_id.trim();
    let mut stmt = conn
        .prepare(
            "SELECT id, project_id, idea_id, name, slug, content, created_at, updated_at FROM milestones WHERE project_id = ?1 ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![project_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, i64>(0)?,
                "project_id": row.get::<_, String>(1)?,
                "idea_id": row.get::<_, i64>(2)?,
                "name": row.get::<_, String>(3)?,
                "slug": row.get::<_, String>(4)?,
                "content": row.get::<_, Option<String>>(5)?,
                "created_at": row.get::<_, String>(6)?,
                "updated_at": row.get::<_, String>(7)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut out = vec![];
    for row in rows {
        out.push(row.map_err(|e| e.to_string())?);
    }
    let has_legacy_general = out
        .iter()
        .any(|v| v.get("name").and_then(|n| n.as_str()) == Some("General Development"));
    if has_legacy_general {
        conn.execute(
            "DELETE FROM milestones WHERE project_id = ?1 AND name = ?2",
            rusqlite::params![project_id, "General Development"],
        )
        .map_err(|e| e.to_string())?;
        let mut stmt2 = conn
            .prepare(
                "SELECT id, project_id, idea_id, name, slug, content, created_at, updated_at FROM milestones WHERE project_id = ?1 ORDER BY name ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows2 = stmt2
            .query_map(rusqlite::params![project_id], |row| {
                Ok(serde_json::json!({
                    "id": row.get::<_, i64>(0)?,
                    "project_id": row.get::<_, String>(1)?,
                    "idea_id": row.get::<_, i64>(2)?,
                    "name": row.get::<_, String>(3)?,
                    "slug": row.get::<_, String>(4)?,
                    "content": row.get::<_, Option<String>>(5)?,
                    "created_at": row.get::<_, String>(6)?,
                    "updated_at": row.get::<_, String>(7)?,
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

fn create_linked_milestone_for_idea(
    conn: &Connection,
    project_id: &str,
    idea_id: i64,
    title: &str,
    now: &str,
) -> Result<i64, String> {
    let slug = format!(
        "{}-{}",
        title
            .trim()
            .to_lowercase()
            .chars()
            .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
            .collect::<String>()
            .trim_matches('-'),
        idea_id
    );
    conn.execute(
        "INSERT INTO milestones (project_id, idea_id, name, slug, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![project_id.trim(), idea_id, format!("{} milestone", title.trim()), slug, Option::<String>::None, now, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

fn create_template_plan_tickets_for_idea(
    conn: &Connection,
    project_id: &str,
    idea_id: i64,
    milestone_id: i64,
    title: &str,
    now: &str,
) -> Result<(), String> {
    for suffix in ["Discovery", "Implementation"] {
        let number: i64 = conn
            .query_row(
                "SELECT COALESCE(MAX(number), 0) FROM plan_tickets WHERE project_id = ?1",
                rusqlite::params![project_id.trim()],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?
            + 1;
        let id = format!("ticket-{}-{}", project_id.trim(), number);
        conn.execute(
            "INSERT INTO plan_tickets (id, project_id, number, title, description, priority, feature_name, done, status, milestone_id, idea_id, agents, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, 'P1', ?6, 0, 'Todo', ?7, ?8, ?9, ?10, ?11)",
            rusqlite::params![
                id,
                project_id.trim(),
                number,
                format!("{} - {}", title.trim(), suffix),
                Option::<String>::None,
                title.trim(),
                milestone_id,
                idea_id,
                Option::<String>::None,
                now,
                now,
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn create_idea(
    conn: &Connection,
    project_id: Option<&str>,
    title: &str,
    description: &str,
    category: &str,
    source: &str,
) -> Result<serde_json::Value, String> {
    let project_id = project_id.ok_or_else(|| "project_id is required".to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute("BEGIN IMMEDIATE TRANSACTION", []).map_err(|e| e.to_string())?;
    let result = (|| {
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
        let milestone_id = create_linked_milestone_for_idea(conn, project_id, id, title, &now)?;
        create_template_plan_tickets_for_idea(conn, project_id, id, milestone_id, title, &now)?;
        Ok::<i64, String>(id)
    })();
    match result {
        Ok(_) => conn.execute("COMMIT", []).map_err(|e| e.to_string())?,
        Err(e) => {
            let _ = conn.execute("ROLLBACK", []);
            return Err(e);
        }
    }
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

pub fn delete_idea(conn: &Connection, idea_id: i64) -> Result<(), String> {
    let affected = conn
        .execute("DELETE FROM ideas WHERE id = ?1", rusqlite::params![idea_id])
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("Idea not found".to_string());
    }
    Ok(())
}

pub fn create_milestone(
    conn: &Connection,
    project_id: &str,
    name: &str,
    slug: &str,
    content: Option<&str>,
) -> Result<serde_json::Value, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let idea_id: i64 = conn
        .query_row(
            "SELECT id FROM ideas WHERE project_id = ?1 ORDER BY id ASC LIMIT 1",
            rusqlite::params![project_id.trim()],
            |row| row.get(0),
        )
        .map_err(|_| "Cannot create milestone without a linked project idea".to_string())?;
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
    let slug_use = if slug_use.is_empty() {
        "milestone".to_string()
    } else {
        slug_use
    };
    conn.execute(
        "INSERT INTO milestones (project_id, idea_id, name, slug, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            project_id.trim(),
            idea_id,
            name.trim(),
            slug_use,
            content.unwrap_or("").trim(),
            &now,
            &now,
        ],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let (project_id_out, idea_id_out, name_out, slug_out, content_out, created_at, updated_at): (
        String, i64, String, String, Option<String>, String, String,
    ) = conn
        .query_row(
            "SELECT project_id, idea_id, name, slug, content, created_at, updated_at FROM milestones WHERE id = ?1",
            rusqlite::params![id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?, row.get(6)?)),
        )
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "id": id,
        "project_id": project_id_out,
        "idea_id": idea_id_out,
        "name": name_out,
        "slug": slug_out,
        "content": content_out,
        "created_at": created_at,
        "updated_at": updated_at,
    }))
}

pub fn delete_milestone(
    conn: &Connection,
    project_id: &str,
    milestone_id: i64,
) -> Result<(), String> {
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

pub fn get_ideas_list(
    conn: &Connection,
    project_id: Option<&str>,
) -> Result<Vec<serde_json::Value>, String> {
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
    let mut out = vec![];
    if let Some(pid) = project_id {
        let mut stmt = conn
            .prepare("SELECT id, project_id, title, description, category, source, created_at, updated_at FROM ideas WHERE project_id = ?1 OR project_id IS NULL ORDER BY id ASC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(rusqlite::params![pid.trim()], map_row)
            .map_err(|e| e.to_string())?;
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

pub fn run_integrity_audit_for_project(
    conn: &Connection,
    project_id: &str,
) -> Result<serde_json::Value, String> {
    let project_id = project_id.trim();
    let count = |sql: &str| -> Result<i64, String> {
        conn.query_row(sql, rusqlite::params![project_id], |row| row.get(0))
            .map_err(|e| e.to_string())
    };
    Ok(serde_json::json!({
        "projectId": project_id,
        "discrepancies": {
            "orphanIdeasWithoutMilestone": count("SELECT COUNT(*) FROM ideas i LEFT JOIN milestones m ON m.idea_id = i.id AND m.project_id = i.project_id WHERE i.project_id = ?1 AND m.id IS NULL")?,
            "orphanIdeasWithoutTicket": count("SELECT COUNT(*) FROM ideas i LEFT JOIN plan_tickets t ON t.idea_id = i.id AND t.project_id = i.project_id WHERE i.project_id = ?1 AND t.id IS NULL")?,
            "orphanMilestonesIdea": count("SELECT COUNT(*) FROM milestones m LEFT JOIN ideas i ON i.id = m.idea_id WHERE m.project_id = ?1 AND i.id IS NULL")?,
            "orphanTicketsMilestone": count("SELECT COUNT(*) FROM plan_tickets t LEFT JOIN milestones m ON m.id = t.milestone_id WHERE t.project_id = ?1 AND m.id IS NULL")?,
            "orphanTicketsIdea": count("SELECT COUNT(*) FROM plan_tickets t LEFT JOIN ideas i ON i.id = t.idea_id WHERE t.project_id = ?1 AND i.id IS NULL")?,
        }
    }))
}
