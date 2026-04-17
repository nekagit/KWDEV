/**
 * Prompt builder for Worker tab Quality "Audit selected quality items".
 */
export function buildWorkerEnhancementsTestingPrompt(selectedItemLabels: string[] = []): string {
  const selectedList =
    selectedItemLabels.length > 0
      ? selectedItemLabels.map((label) => `- ${label}`).join("\n")
      : "- No specific items were selected. Audit all quality dimensions in the Quality section.";

  return [
    "You are in the current project repository.",
    "",
    "Goal: produce a concrete quality audit based on the checked Quality section items.",
    "",
    "Instructions:",
    "1. Treat PROJECT.md as the single source of truth for project structure and current architecture.",
    "2. Analyze the current codebase against every selected item listed below.",
    "3. For EACH selected item, provide a score from 0-100 based on current implementation quality.",
    "4. For EACH selected item, provide concrete suggestions (what to change, why, and where).",
    "5. Include quick wins and high-impact follow-up actions.",
    "",
    "Selected items that MUST be included in the audit report:",
    selectedList,
    "",
    "Output requirements:",
    "- Write the full report to `quality-audit-report.md` at repo root.",
    "- Include a section `Audit Matrix` with one row per selected item.",
    "- Each row must include: Item, Score (0-100), Findings, Suggestions.",
    "- Add `Overall Quality Score` as the average of all item scores.",
    "- Add `Top 5 Suggestions` prioritized by impact and effort.",
    "- If an item has no issue, still include it with a score and short justification.",
    "",
    "After writing the report, print a short completion message with the report path.",
  ].join("\n");
}
