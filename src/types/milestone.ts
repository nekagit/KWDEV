/**
 * Milestone is a DB entry (table: milestones) with a numeric id.
 * Use milestone_id to reference milestones from tickets, implementation_log, etc.
 */
export type MilestoneRecord = {
  id: number;
  project_id: string;
  name: string;
  slug: string;
  content?: string | null;
  created_at?: string;
  updated_at?: string;
};
