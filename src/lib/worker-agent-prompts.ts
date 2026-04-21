type WorkerPromptProject = {
  name?: string | null;
  repoPath?: string | null;
};

export function buildCleanupRefactorAgentPrompt(
  project: WorkerPromptProject,
  template: string,
  iterationIndex: number,
  qualityFocusLabels: string[]
): string {
  const intro = template.trim()
    ? template.trim()
    : "Act as a cleanup + refactor agent. Improve structure and maintainability while keeping the repository tidy and preserving behavior.";
  const qualityFocusSection =
    qualityFocusLabels.length > 0
      ? [
          "## Quality focus",
          ...qualityFocusLabels.map((label) => `- ${label}`),
        ]
      : [
          "## Quality focus",
          "- No explicit quality focus was selected. Use your judgment to prioritize the highest-impact cleanup and refactor opportunities.",
        ];

  return [
    intro,
    "",
    "## Project context",
    `- Project: ${project.name ?? "Unknown project"}`,
    `- Repository path: ${project.repoPath ?? "Unknown path"}`,
    `- Iteration: ${iterationIndex}`,
    "",
    ...qualityFocusSection,
    "",
    "## Output requirements",
    "- Show the concrete prompt intent for this iteration.",
    "- Perform cleanup and refactor work without changing expected behavior.",
    "- Report structural improvements, cleanup actions, and touched files.",
    "- Only modify code-related files (source, tests, and code tooling config).",
    "- Do NOT modify any `.md` files.",
  ].join("\n");
}
