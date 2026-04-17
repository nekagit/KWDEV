type WorkerPromptProject = {
  name?: string | null;
  repoPath?: string | null;
};

export function buildCleanupAgentPrompt(
  project: WorkerPromptProject,
  template: string,
  iterationIndex: number
): string {
  const intro = template.trim()
    ? template.trim()
    : "Act as a cleanup agent. Remove stale artifacts, tidy project files, and report cleanup changes.";
  return [
    intro,
    "",
    "## Project context",
    `- Project: ${project.name ?? "Unknown project"}`,
    `- Repository path: ${project.repoPath ?? "Unknown path"}`,
    `- Iteration: ${iterationIndex}`,
    "",
    "## Output requirements",
    "- Show the concrete prompt intent for this iteration.",
    "- Perform cleanup and hygiene tasks for this codebase.",
    "- Report removed/updated files and why.",
    "- Only modify code-related files (source, tests, and code tooling config).",
    "- Do NOT modify any `.md` files.",
  ].join("\n");
}

export function buildRefactorAgentPrompt(
  project: WorkerPromptProject,
  template: string,
  iterationIndex: number
): string {
  const intro = template.trim()
    ? template.trim()
    : "Act as a refactor agent. Improve structure and maintainability while preserving behavior.";
  return [
    intro,
    "",
    "## Project context",
    `- Project: ${project.name ?? "Unknown project"}`,
    `- Repository path: ${project.repoPath ?? "Unknown path"}`,
    `- Iteration: ${iterationIndex}`,
    "",
    "## Output requirements",
    "- Show the concrete prompt intent for this iteration.",
    "- Refactor code paths without changing expected behavior.",
    "- Report structural improvements and touched files.",
    "- Only modify code-related files (source, tests, and code tooling config).",
    "- Do NOT modify any `.md` files.",
  ].join("\n");
}
