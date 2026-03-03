//! Milestones and ideas per project.

use rusqlite::Connection;

const GENERAL_DEVELOPMENT_NAME: &str = "General Development";
const GENERAL_DEVELOPMENT_SLUG: &str = "general-development";

pub fn get_milestones_for_project(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<serde_json::Value>, String> {
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
    let has_general = out
        .iter()
        .any(|v| v.get("name").and_then(|n| n.as_str()) == Some(GENERAL_DEVELOPMENT_NAME));
    if !has_general {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO milestones (project_id, name, slug, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![
                project_id,
                GENERAL_DEVELOPMENT_NAME,
                GENERAL_DEVELOPMENT_SLUG,
                None::<String>,
                &now,
                &now,
            ],
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
