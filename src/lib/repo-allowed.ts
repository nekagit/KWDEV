/**
 * Repo path allowlist for API access: only repos under app dir, sibling of app dir, or listed in ALLOWED_REPO_PREFIXES.
 */
import path from "path";

/** Semicolon-separated list of absolute path prefixes that are allowed (e.g. /Users/me/Documents/KW). */
const ALLOWED_REPO_PREFIXES_ENV = "ALLOWED_REPO_PREFIXES";

function getAllowedPrefixes(): string[] {
  const raw = process.env[ALLOWED_REPO_PREFIXES_ENV];
  if (!raw?.trim()) return [];
  return raw
    .split(";")
    .map((p) => path.resolve(p.trim()))
    .filter((p) => p.length > 0);
}

/**
 * Whether a project repo path is allowed for API access (read/write files, analyze, etc.).
 * Allows:
 * - Repo inside the app directory (resolvedRepo under cwd).
 * - Repo that is a sibling of the app directory (same parent, e.g. all projects in February folder).
 * - Repo under any path in ALLOWED_REPO_PREFIXES (semicolon-separated absolute prefixes).
 */
export function repoAllowed(resolvedRepo: string, cwd: string): boolean {
  const repoResolved = path.resolve(resolvedRepo);
  const cwdResolved = path.resolve(cwd);

  if (repoResolved.startsWith(cwdResolved)) return true;
  if (path.dirname(repoResolved) === path.dirname(cwdResolved)) return true;

  const prefixes = getAllowedPrefixes();
  for (const prefix of prefixes) {
    if (repoResolved === prefix || repoResolved.startsWith(prefix + path.sep)) return true;
  }
  return false;
}
