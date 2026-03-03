/**
 * Shared helpers for building CSV content in download/export modules.
 * Used by download-*-csv libs to avoid duplicating escaping logic.
 */

/**
 * Escape a CSV field per RFC 4180: wrap in double-quotes if the value contains
 * comma, newline, or double-quote; double any internal double-quotes.
 *
 * @param value - Raw field value (will be stringified)
 * @returns Safe CSV field string (unquoted or quoted as needed)
 */
export function escapeCsvField(value: string): string {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
