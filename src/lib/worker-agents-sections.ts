export type WorkerAgentsSectionId = "testing" | "cleanup-refactor" | "night-shift";

export const DEFAULT_OPEN_WORKER_AGENT_SECTIONS: WorkerAgentsSectionId[] = [
  "testing",
  "cleanup-refactor",
];

export function toggleWorkerAgentsSection(
  openSections: WorkerAgentsSectionId[],
  section: WorkerAgentsSectionId
): WorkerAgentsSectionId[] {
  if (openSections.includes(section)) {
    return openSections.filter((s) => s !== section);
  }
  return [...openSections, section];
}
