/**
 * Parses the output of `git remote -v` and returns the first remote URL.
 * Used to open the first project's Git remote (e.g. GitHub/GitLab) in the browser.
 *
 * Typical format:
 *   origin  https://github.com/user/repo.git (fetch)
 *   origin  https://github.com/user/repo.git (push)
 *
 * @param remotes - Raw string from GitInfo.remotes (git remote -v output)
 * @returns First URL (http/https) or null if none found
 */
export function parseFirstRemoteUrl(remotes: string): string | null {
  if (!remotes || typeof remotes !== "string") return null;
  const trimmed = remotes.trim();
  if (!trimmed) return null;
  // Match first http:// or https:// URL (non-greedy, then stop at space or newline)
  const match = trimmed.match(/https?:\/\/[^\s]+/);
  return match ? match[0].replace(/\.git$/, "") : null;
}
