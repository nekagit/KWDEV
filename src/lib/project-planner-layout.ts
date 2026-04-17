export const PROJECT_PLANNER_SECTION_ORDER = [
  "kanban",
  "planner-manager",
] as const;

export type ProjectPlannerSectionId = (typeof PROJECT_PLANNER_SECTION_ORDER)[number];
