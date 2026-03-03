/**
 * Optional debug ingest: only sends when NEXT_PUBLIC_DEBUG_INGEST_URL is set.
 * When unset (default), no fetch is made, so the app does not log connection/CORS errors.
 */
const DEBUG_INGEST_URL =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_DEBUG_INGEST_URL : undefined;

export function debugIngest(payload: Record<string, unknown>, headers?: Record<string, string>): void {
  if (!DEBUG_INGEST_URL) return;
  fetch(DEBUG_INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
