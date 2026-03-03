/**
 * Dual-mode fetch for App Analyzer: Tauri invoke vs Next.js API route.
 * Use in Tauri: invoke("fetch_url", { url }).
 * Use in browser: POST /api/app-analyzer/fetch with { url }.
 */
import { invoke, isTauri } from "@/lib/tauri";
import type { FetchUrlResult } from "@/types/app-analyzer";

const BODY_SIZE_LIMIT = 500 * 1024; // 500 KB (backend may truncate; we accept what we get)

export interface FetchUrlError {
  error: string;
}

/**
 * Fetches the given URL and returns status, headers, and body.
 * In Tauri: uses Rust fetch_url command.
 * In browser: uses POST /api/app-analyzer/fetch.
 */
export async function fetchUrlForAudit(url: string): Promise<FetchUrlResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("URL is required");
  }

  if (isTauri) {
    const result = await invoke<FetchUrlResult>("fetch_url", { url: trimmed });
    return result;
  }

  const res = await fetch("/api/app-analyzer/fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: trimmed }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = (data as FetchUrlError).error ?? res.statusText ?? "Fetch failed";
    throw new Error(message);
  }

  const out = data as FetchUrlResult;
  if (typeof out?.statusCode !== "number" || typeof out?.body !== "string") {
    throw new Error("Invalid response from fetch");
  }
  return {
    statusCode: out.statusCode,
    headers: out.headers && typeof out.headers === "object" ? out.headers : {},
    body: out.body.length > BODY_SIZE_LIMIT ? out.body.slice(0, BODY_SIZE_LIMIT) : out.body,
  };
}
