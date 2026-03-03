/**
 * Strip terminal/agent log lines from raw output so written .md files contain
 * only document content conformant with UI (ideas.md, design.md, etc.).
 * Used by analyze-project-doc API and clean-analysis-docs API.
 */

/** Patterns that indicate terminal/agent log lines (not document content). */
const TERMINAL_ARTIFACT_PATTERNS = [
  /^[\s━═─]+$/, // only box-drawing or dashes
  /implement all\s*[–-]\s*terminal slot/i,
  /^project:\s*\/[\s\S]*$/i, // "Project: /path" (any path)
  /cd into project path/i,
  /^[→]\s+\//, // "→ /path"
  /^cd\s+\/[\s\S]*$/i, // "cd /path"
  /running:\s*agent\s+-p/i,
  /summary of what was done/i,
  /summary of what'?s in place/i, // "Summary of what's in place"
  /done\.\s*agent exited/i,
  /^\*\*`\.cursor\/[\s\S]*`\*\*\s*[—–-]/, // "**`.cursor/...`** — ..."
  /^\.cursor\/[\s\S]*\s+[—–-]\s/i, // ".CURSOR/... — "
];

/** Looks like start of real document content (e.g. # Project Context or ## Vision). */
function isDocumentStart(trimmed: string): boolean {
  return /^#+\s+\w/.test(trimmed) && trimmed.length > 3;
}

/**
 * Remove terminal/agent log lines and summary blocks ("Summary of what was done",
 * "Summary of what's in place" and following meta lines) so the result contains
 * only document content.
 */
export function stripTerminalArtifacts(raw: string): string {
  const lines = raw.split("\n");
  const filtered: string[] = [];
  let lastLine: string | null = null;
  let inSummaryBlock = false;
  let inSummaryInPlaceBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/summary of what was done/i.test(trimmed)) {
      inSummaryBlock = true;
      inSummaryInPlaceBlock = false;
      continue;
    }
    if (/summary of what'?s in place/i.test(trimmed)) {
      inSummaryInPlaceBlock = true;
      inSummaryBlock = false;
      continue;
    }
    if (inSummaryBlock) {
      if (/done\.\s*agent exited/i.test(trimmed) || /^[\s━═─]+$/.test(trimmed)) {
        inSummaryBlock = false;
      }
      continue;
    }
    if (inSummaryInPlaceBlock) {
      // Keep skipping until we see real document content (e.g. # Project Context)
      if (isDocumentStart(trimmed)) {
        inSummaryInPlaceBlock = false;
      } else {
        continue;
      }
    }

    const isArtifact = TERMINAL_ARTIFACT_PATTERNS.some((p) => p.test(trimmed));
    if (isArtifact) continue;
    if (trimmed === lastLine) continue;
    lastLine = trimmed;
    filtered.push(line);
  }

  let start = 0;
  let end = filtered.length;
  while (start < end && !filtered[start].trim()) start++;
  while (end > start && !filtered[end - 1].trim()) end--;
  return filtered.slice(start, end).join("\n").trim();
}

export const MIN_DOCUMENT_LENGTH = 200;
