//! Project documents and project configs (frontend/backend).

use rusqlite::Connection;

/// Valid doc_type values for project_docs table.
pub const PROJECT_DOC_TYPES: &[&str] =
    &["ideas", "design", "architecture", "testing", "documentation", "project_info"];

pub fn get_project_doc(
    conn: &Connection,
    project_id: &str,
    doc_type: &str,
) -> Result<String, String> {
    let project_id = project_id.trim();
    let doc_type = doc_type.trim();
    if !PROJECT_DOC_TYPES.contains(&doc_type) {
        return Err(format!(
            "Invalid doc_type: {}. Must be one of: {:?}",
            doc_type, PROJECT_DOC_TYPES
        ));
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

pub fn set_project_doc(
    conn: &Connection,
    project_id: &str,
    doc_type: &str,
    content: &str,
) -> Result<(), String> {
    let project_id = project_id.trim();
    let doc_type = doc_type.trim();
    if !PROJECT_DOC_TYPES.contains(&doc_type) {
        return Err(format!(
            "Invalid doc_type: {}. Must be one of: {:?}",
            doc_type, PROJECT_DOC_TYPES
        ));
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

pub fn get_all_project_docs(
    conn: &Connection,
    project_id: &str,
) -> Result<serde_json::Value, String> {
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

/// Valid config_type values for project_configs table.
pub const PROJECT_CONFIG_TYPES: &[&str] = &["frontend", "backend", "static_analysis_tools"];

pub fn get_project_config(
    conn: &Connection,
    project_id: &str,
    config_type: &str,
) -> Result<serde_json::Value, String> {
    let project_id = project_id.trim();
    let config_type = config_type.trim();
    if !PROJECT_CONFIG_TYPES.contains(&config_type) {
        return Err(format!(
            "Invalid config_type: {}. Must be one of: {:?}",
            config_type, PROJECT_CONFIG_TYPES
        ));
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
            let config: serde_json::Value =
                serde_json::from_str(&config_json).unwrap_or(serde_json::json!({}));
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
        return Err(format!(
            "Invalid config_type: {}. Must be one of: {:?}",
            config_type, PROJECT_CONFIG_TYPES
        ));
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

pub fn get_all_project_configs(
    conn: &Connection,
    project_id: &str,
) -> Result<serde_json::Value, String> {
    let project_id = project_id.trim();
    let mut stmt = conn
        .prepare("SELECT config_type, config_json, analysis_content, created_at, updated_at FROM project_configs WHERE project_id = ?1")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![project_id], |row| {
            let config_json: String = row.get(1)?;
            let config: serde_json::Value =
                serde_json::from_str(&config_json).unwrap_or(serde_json::json!({}));
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
