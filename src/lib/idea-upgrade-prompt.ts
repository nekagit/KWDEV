/**
 * Shared prompt and parser for upgrading a raw idea to the project's current state.
 * Used by the improve-idea API route and the Tauri improve_idea_for_project command.
 */

export interface IdeaUpgradeContext {
  projectName: string;
  projectDescription?: string | null;
  existingIdeas: { title: string; description?: string | null }[];
  milestones: { name: string; content?: string | null }[];
  tickets: { title: string; description?: string | null }[];
}

/**
 * Build the upgrade prompt text. The model must output:
 * - First line: improved idea title (one line, no markdown).
 * - One blank line.
 * - Rest: improved description in markdown (2–4 sentences or bullets), same language as input.
 */
export function buildIdeaUpgradePrompt(
  rawTitle: string,
  rawDescription: string,
  context: IdeaUpgradeContext
): string {
  const { projectName, projectDescription, existingIdeas, milestones, tickets } = context;

  const descBlock = projectDescription?.trim() ? projectDescription.trim() : "(none)";
  const ideasBlock =
    existingIdeas.length === 0
      ? "(none)"
      : existingIdeas
          .map((i) => `- ${i.title}${i.description?.trim() ? ` — ${i.description.trim().slice(0, 120)}` : ""}`)
          .join("\n");
  const milestonesBlock =
    milestones.length === 0
      ? "(none)"
      : milestones
          .map((m) => `- ${m.name}${m.content?.trim() ? ` — ${m.content.trim().slice(0, 120)}` : ""}`)
          .join("\n");
  const ticketsBlock =
    tickets.length === 0
      ? "(none)"
      : tickets
          .map((t) => `- ${t.title}${t.description?.trim() ? ` — ${t.description.trim().slice(0, 120)}` : ""}`)
          .join("\n");

  const rawDesc = rawDescription?.trim() ? rawDescription.trim() : "(no description)";

  return `You are tailoring a product/feature idea to an existing project. Use the project's current state below. Output in the same language as the user's input.

Project: ${projectName}
Description: ${descBlock}

Existing ideas (title and optional short description):
${ideasBlock}

Milestones (name and optional content):
${milestonesBlock}

Recent tickets (title and optional short description):
${ticketsBlock}

User's raw idea —
Title: ${rawTitle}
Description: ${rawDesc}

Output exactly:
- First line: improved idea title (one line, no markdown, no heading).
- Then one blank line.
- Then the improved description in markdown (2–4 sentences or bullets). No extra preamble or explanation.`;
}

export interface ParsedUpgrade {
  improvedTitle: string;
  improvedDescription: string;
}

/**
 * Parse agent stdout into title (first line) and description (rest after blank line).
 * Falls back to whole output as description and rawTitle as title if parsing fails.
 */
export function parseIdeaUpgradeOutput(
  rawOutput: string,
  fallbackTitle: string
): ParsedUpgrade {
  const trimmed = rawOutput.trim();
  if (!trimmed) {
    return { improvedTitle: fallbackTitle, improvedDescription: "" };
  }
  const lines = trimmed.split(/\r?\n/);
  const firstLine = lines[0]?.trim() ?? "";
  // Find first blank line; everything after is description
  let descStart = 1;
  while (descStart < lines.length && lines[descStart]?.trim() === "") {
    descStart += 1;
  }
  const descriptionLines = lines.slice(descStart);
  const improvedDescription = descriptionLines.join("\n").trim();

  const improvedTitle = firstLine || fallbackTitle;
  return {
    improvedTitle,
    improvedDescription: improvedDescription || "",
  };
}
