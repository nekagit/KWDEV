//! Key-value store table access (generic kv_store entries for Data view).

use rusqlite::Connection;
use serde::{Deserialize, Serialize};

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
