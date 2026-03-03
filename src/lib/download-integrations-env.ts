/**
 * Build .env file content from key-value entries and trigger download.
 * Used by the Integrations page.
 */

import { triggerFileDownload } from "@/lib/download-helpers";

export interface EnvKeyValue {
  key: string;
  value: string;
}

/**
 * Escape a value for .env: if it contains space, newline, or #, wrap in double quotes and escape " and \.
 */
function escapeEnvValue(value: string): string {
  const needsQuotes = /[\s#"\\]/.test(value);
  if (!needsQuotes) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Build .env file content. Skips entries with empty key. Comments out empty values if desired; we output KEY= for empty.
 */
export function buildEnvContent(entries: EnvKeyValue[]): string {
  const lines = entries
    .filter((e) => e.key.trim() !== "")
    .map((e) => {
      const key = e.key.trim();
      const value = e.value.trim();
      return `${key}=${escapeEnvValue(value)}`;
    });
  return lines.join("\n") + (lines.length ? "\n" : "");
}

const INTEGRATIONS_ENV_FILENAME = ".env";

/**
 * Download current entries as a .env file.
 */
export function downloadIntegrationsEnv(entries: EnvKeyValue[]): void {
  const content = buildEnvContent(entries);
  triggerFileDownload(content, INTEGRATIONS_ENV_FILENAME, "text/plain");
}
