/**
 * Repo path allowlist for API access: only repos under app dir or sibling of app dir.
 */
import path from "path";

/**
 * Whether a project repo path is allowed for API access (read/write files, analyze, etc.).
 * Allows:
 * - Repo inside the app directory (resolvedRepo under cwd).
 * - Repo that is a sibling of the app directory (same parent, e.g. all projects in February folder).
 * This ensures all projects in the same parent folder (e.g. Documents/February) are trusted.
 */
export function repoAllowed(resolvedRepo: string, cwd: string): boolean {
  const cwdResolved = path.resolve(cwd);
  return (
    resolvedRepo.startsWith(cwdResolved) ||
    path.dirname(resolvedRepo) === path.dirname(cwdResolved)
  );
}
