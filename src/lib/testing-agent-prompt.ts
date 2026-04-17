type TestingPromptProject = {
  name?: string | null;
  repoPath?: string | null;
};

export function buildTestingAgentPrompt(
  project: TestingPromptProject,
  template: string,
  iterationIndex: number
): string {
  const intro = template.trim()
    ? template.trim()
    : "Act as a testing agent. Analyze the project, create or improve tests, and report what changed.";

  return [
    intro,
    "",
    "## Project context",
    `- Project: ${project.name ?? "Unknown project"}`,
    `- Repository path: ${project.repoPath ?? "Unknown path"}`,
    `- Iteration: ${iterationIndex}`,
    "",
    "## Execution constraints",
    "- Before making edits, provide a short Execution plan with 3-5 bullets.",
    "- In this iteration, make meaningful test improvements across at least 3 files when possible (tests, related helpers, and/or minimal production fixes required for tests).",
    "- Do not stop after a single small test edit.",
    "- Prefer broader coverage upgrades (core path + edge cases + failure paths), not only one happy-path assertion.",
    "- Only modify code-related files (source, tests, config required for code/test execution).",
    "- Do NOT modify any `.md` files.",
    "",
    "## Output requirements",
    "- Execute test-related work for this codebase.",
    "- Run relevant tests and include the result.",
    "- End with a Changed files summary listing each updated file and why it changed.",
  ].join("\n");
}
