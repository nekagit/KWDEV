/**
 * Fetches GET /api/health and returns { ok, version }.
 * Only meaningful in browser mode; in Tauri production there is no Next server.
 * Callers should use this only when !isTauri.
 */
export type ApiHealthResponse = { ok: boolean; version?: string };

export async function getApiHealth(): Promise<ApiHealthResponse> {
  const res = await fetch("/api/health");
  const data = (await res.json()) as ApiHealthResponse;
  if (!res.ok) {
    throw new Error("API health check failed");
  }
  return data;
}
