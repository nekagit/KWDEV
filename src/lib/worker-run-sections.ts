export type WorkerRunSectionId =
  | "status"
  | "queue"
  | "agents"
  | "vibing"
  | "enhancements"
  | "terminal-output";

export function toggleWorkerRunSection(
  openSections: WorkerRunSectionId[],
  section: WorkerRunSectionId
): WorkerRunSectionId[] {
  if (openSections.includes(section)) {
    return openSections.filter((s) => s !== section);
  }
  return [...openSections, section];
}
