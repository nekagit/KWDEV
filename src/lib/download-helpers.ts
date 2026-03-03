/**
 * Shared helpers for download and export modules: filename sanitization,
 * timestamp for filenames, and triggering a blob/string download in the browser.
 * Used by download-* and export-* libs to avoid duplicating the same logic.
 */

/**
 * Sanitize a string for use as a filename segment: replace unsafe chars with
 * underscore, normalise spaces to hyphens, trim, and limit length. If the
 * result is empty, returns the fallback.
 *
 * Two-arg form: safeFilenameSegment(text, fallback) — uses default maxLength 60.
 * Three-arg form: safeFilenameSegment(text, maxLength, fallback).
 *
 * @param text - Raw label/title/name
 * @param maxLengthOrFallback - Max segment length (number) or fallback (string) when two args
 * @param fallback - Value when sanitized result is empty (when three args)
 */
export function safeFilenameSegment(
  text: string,
  maxLengthOrFallback?: number | string,
  fallback?: string
): string {
  let maxLength = 60;
  let fb = "file";
  if (typeof maxLengthOrFallback === "string") {
    fb = maxLengthOrFallback;
  } else if (typeof maxLengthOrFallback === "number") {
    maxLength = maxLengthOrFallback;
    fb = fallback ?? "file";
  }
  const sanitized = text
    .trim()
    .replace(/[^\w\s-]/g, "_")
    .replace(/\s+/g, "-");
  return sanitized.slice(0, maxLength) || fb;
}

/** Alias for safeFilenameSegment for callers that use "name" in their domain. */
export function safeNameForFile(
  name: string,
  fallback?: string
): string {
  return safeFilenameSegment(name, fallback ?? "file");
}

/**
 * Returns a timestamp string for filenames: YYYY-MM-DD-HHmm.
 */
export function filenameTimestamp(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(":", "");
  return `${date}-${time}`;
}

/**
 * Trigger a file download in the browser for the given blob. Creates a
 * temporary anchor, programmatic click, then revokes the object URL.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Trigger a file download for string content (e.g. markdown or plain text).
 * Creates a Blob with the given MIME type and calls downloadBlob.
 */
export function triggerFileDownload(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}
