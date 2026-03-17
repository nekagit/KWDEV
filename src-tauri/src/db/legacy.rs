//! Legacy tickets, features, prompts, designs tables (used when not using project-scoped plan_tickets).

use rusqlite::{Connection, params};

/// Read id from row; SQLite may store as TEXT or INTEGER (legacy), so we accept both.
fn get_id_string(row: &rusqlite::Row, idx: usize) -> rusqlite::Result<String> {
    row.get::<_, String>(idx)
        .or_else(|_| row.get::<_, i64>(idx).map(|n| n.to_string()))
}

/// Get all tickets from the tickets table.
pub fn get_tickets(conn: &Connection) -> Result<Vec<crate::Ticket>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, status, priority, created_at, updated_at, prompt_ids, project_paths FROM tickets ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let prompt_ids: Option<String> = row.get(7)?;
            let project_paths: Option<String> = row.get(8)?;
            Ok(crate::Ticket {
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

pub fn save_tickets(conn: &Connection, tickets: &[crate::Ticket]) -> Result<(), String> {
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

pub fn get_features(conn: &Connection) -> Result<Vec<crate::Feature>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, ticket_ids, prompt_ids, project_paths, created_at, updated_at FROM features ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(crate::Feature {
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

pub fn save_features(conn: &Connection, features: &[crate::Feature]) -> Result<(), String> {
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

pub fn get_prompts(conn: &Connection) -> Result<Vec<crate::Prompt>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, content, created_at, updated_at FROM prompts ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(crate::Prompt {
                id: get_id_string(row, 0)?,
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

pub fn save_prompts(conn: &Connection, prompts: &[crate::Prompt]) -> Result<(), String> {
    conn.execute("DELETE FROM prompts", []).map_err(|e| e.to_string())?;
    for p in prompts {
        conn.execute(
            "INSERT INTO prompts (id, title, content, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![p.id, p.title, p.content, p.created_at, p.updated_at],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn get_designs(conn: &Connection) -> Result<Vec<crate::Design>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, image_url, created_at, updated_at FROM designs ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(crate::Design {
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

pub fn save_designs(conn: &Connection, designs: &[crate::Design]) -> Result<(), String> {
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
