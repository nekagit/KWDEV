/**
 * Prompt record type for prompts stored in the database and shown in the Prompts tab.
 */
export interface PromptRecord {
  id: number;
  title: string;
  description?: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}