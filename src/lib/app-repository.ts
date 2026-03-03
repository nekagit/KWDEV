/**
 * App repository URL for "View source" / "Open repository" on the Configuration page.
 * Set NEXT_PUBLIC_APP_REPOSITORY_URL (e.g. https://github.com/org/repo) to show the link.
 */

/**
 * Returns the app repository URL if configured, otherwise null.
 * Safe to call on client; Next.js inlines NEXT_PUBLIC_* at build time.
 */
export function getAppRepositoryUrl(): string | null {
  if (typeof process === "undefined" || !process.env) return null;
  const raw = process.env.NEXT_PUBLIC_APP_REPOSITORY_URL;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
