const DEFAULT_COMMIT_MESSAGE = "Update";

function inferTypeFromRecentCommits(lastCommits: string[]): string {
  for (const line of lastCommits) {
    const trimmed = line.trim().toLowerCase();
    const match = trimmed.match(/^([a-z]+)(\(.+\))?:\s+/);
    if (!match) continue;
    const candidate = match[1];
    if (candidate === "feat" || candidate === "fix" || candidate === "chore" || candidate === "refactor" || candidate === "docs" || candidate === "test") {
      return candidate;
    }
  }
  return "chore";
}

function inferScopeFromRecentCommits(lastCommits: string[]): string | null {
  for (const line of lastCommits) {
    const trimmed = line.trim();
    const match = trimmed.match(/^[a-z]+(?:\(([^)]+)\))?:\s+/i);
    const scope = match?.[1]?.trim();
    if (scope) return scope;
  }
  return null;
}

function summarizeAreas(changedFiles: string[]): string {
  const areas = new Set<string>();
  for (const line of changedFiles) {
    const trimmed = line.trim();
    const rawPath = trimmed.length > 2 ? trimmed.slice(2).trim() : trimmed;
    const path = rawPath.replace(/^"+|"+$/g, "");
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 2 && parts[0] === "src") {
      areas.add(parts[1]);
    } else if (parts.length >= 1) {
      areas.add(parts[0]);
    }
    if (areas.size >= 2) break;
  }

  const topAreas = Array.from(areas);
  if (topAreas.length === 0) return "project";
  return topAreas.join(", ");
}

export function generateCommitMessageFromGitContext(
  changedFiles: string[],
  lastCommits: string[],
): string {
  if (changedFiles.length === 0) return DEFAULT_COMMIT_MESSAGE;

  const type = inferTypeFromRecentCommits(lastCommits);
  const scope = inferScopeFromRecentCommits(lastCommits);
  const areaSummary = summarizeAreas(changedFiles);
  const filePart = `${changedFiles.length} file${changedFiles.length === 1 ? "" : "s"}`;
  const prefix = scope ? `${type}(${scope})` : type;
  return `${prefix}: update ${filePart} across ${areaSummary}`;
}

export { DEFAULT_COMMIT_MESSAGE };
