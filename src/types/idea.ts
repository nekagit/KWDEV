/**
 * Idea types: category and IdeaRecord for the Ideas page and API.
 */
export type IdeaCategory = "saas" | "iaas" | "paas" | "website" | "webapp" | "webshop" | "other";

export type IdeaRecord = {
  id: number;
  title: string;
  description: string;
  category: IdeaCategory;
  source: "template" | "ai" | "manual";
  created_at?: string;
  updated_at?: string;
};