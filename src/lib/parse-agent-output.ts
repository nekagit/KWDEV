/**
 * Parsing utilities for structured markdown output from idea-driven night shift agents.
 * These functions extract structured data from agent-generated markdown files.
 */

export interface ParsedIdea {
  title: string;
  description: string;
  rationale?: string;
  projectSummary?: string;
  implementationNotes?: string;
}

export interface ParsedMilestone {
  name: string;
  description: string;
  dependsOn?: string;
}

export interface ParsedTicket {
  title: string;
  description: string;
  priority: "P1" | "P2" | "P3";
  acceptanceCriteria?: string[];
}

/**
 * Parse idea from agent output (idea-analysis-output.md).
 * Expected format:
 * ## Next Feature Idea
 * **Title:** [title]
 * **Description:** [description]
 * **Rationale:** [rationale]
 */
export function parseIdeaFromOutput(content: string): ParsedIdea | null {
  if (!content?.trim()) return null;

  const titleMatch = content.match(/\*\*Title:\*\*\s*(.+?)(?:\n|$)/i);
  const descMatch = content.match(/\*\*Description:\*\*\s*([\s\S]+?)(?:\n\n|\n\*\*|$)/i);
  const rationaleMatch = content.match(/\*\*Rationale:\*\*\s*([\s\S]+?)(?:\n\n|\n##|$)/i);
  const summaryMatch = content.match(/## Project Summary\s*\n([\s\S]+?)(?:\n##|$)/i);
  const implMatch = content.match(/## Implementation Considerations\s*\n([\s\S]+?)(?:\n##|$)/i);

  const title = titleMatch?.[1]?.trim();
  const description = descMatch?.[1]?.trim();

  if (!title || !description) return null;

  return {
    title,
    description,
    rationale: rationaleMatch?.[1]?.trim(),
    projectSummary: summaryMatch?.[1]?.trim(),
    implementationNotes: implMatch?.[1]?.trim(),
  };
}

/**
 * Parse milestones from agent output (milestones-output.md).
 * Expected format:
 * ### Milestone N: [name]
 * **Description:** [description]
 * **Depends On:** [dependencies]
 */
export function parseMilestonesFromOutput(content: string): ParsedMilestone[] {
  if (!content?.trim()) return [];

  const milestones: ParsedMilestone[] = [];
  const milestoneRegex = /### Milestone \d+:\s*(.+?)\n\*\*Description:\*\*\s*([\s\S]+?)(?:\n\*\*Depends On:\*\*\s*([\s\S]+?))?(?=\n### Milestone|\n##|$)/gi;

  let match;
  while ((match = milestoneRegex.exec(content)) !== null) {
    const name = match[1]?.trim();
    const description = match[2]?.trim();
    const dependsOn = match[3]?.trim();

    if (name && description) {
      milestones.push({
        name,
        description,
        dependsOn: dependsOn && dependsOn.toLowerCase() !== "none" ? dependsOn : undefined,
      });
    }
  }

  return milestones;
}

/**
 * Parse tickets from agent output (tickets-output.md).
 * Expected format:
 * ### Ticket N: [title]
 * **Description:** [description]
 * **Priority:** P1/P2/P3
 * **Acceptance Criteria:**
 * - [ ] criterion
 */
export function parseTicketsFromOutput(content: string): ParsedTicket[] {
  if (!content?.trim()) return [];

  const tickets: ParsedTicket[] = [];
  const ticketBlocks = content.split(/(?=### Ticket \d+:)/i).slice(1);

  for (const block of ticketBlocks) {
    const titleMatch = block.match(/### Ticket \d+:\s*(.+?)(?:\n|$)/i);
    const descMatch = block.match(/\*\*Description:\*\*\s*([\s\S]+?)(?:\n\*\*|$)/i);
    const priorityMatch = block.match(/\*\*Priority:\*\*\s*(P[123])/i);
    const criteriaMatch = block.match(/\*\*Acceptance Criteria:\*\*\s*\n((?:- \[[ x]\].+\n?)+)/i);

    const title = titleMatch?.[1]?.trim();
    const description = descMatch?.[1]?.trim();
    const priority = (priorityMatch?.[1]?.toUpperCase() as "P1" | "P2" | "P3") || "P2";

    if (title && description) {
      const criteria: string[] = [];
      if (criteriaMatch?.[1]) {
        const criteriaLines = criteriaMatch[1].split("\n");
        for (const line of criteriaLines) {
          const criterionMatch = line.match(/- \[[ x]\]\s*(.+)/);
          if (criterionMatch?.[1]?.trim()) {
            criteria.push(criterionMatch[1].trim());
          }
        }
      }

      tickets.push({
        title,
        description,
        priority,
        acceptanceCriteria: criteria.length > 0 ? criteria : undefined,
      });
    }
  }

  return tickets;
}

/**
 * Extract the milestone name from tickets output header.
 * Expected: ## Milestone: [name]
 */
export function extractMilestoneNameFromTicketsOutput(content: string): string | null {
  const match = content.match(/## Milestone:\s*(.+?)(?:\n|$)/i);
  return match?.[1]?.trim() ?? null;
}
