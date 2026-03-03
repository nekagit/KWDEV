/**
 * Architecture types: categories (DDD, TDD, etc.) and template shape for My definitions.
 */
/** Architecture / best-practice category for filtering and display */
export type ArchitectureCategory =
  | "ddd"           // Domain-Driven Design
  | "tdd"           // Test-Driven Development
  | "bdd"           // Behavior-Driven Development
  | "dry"           // Don't Repeat Yourself
  | "solid"         // SOLID principles
  | "kiss"          // Keep It Simple, Stupid
  | "yagni"         // You Aren't Gonna Need It
  | "clean"         // Clean Architecture
  | "hexagonal"     // Hexagonal / Ports & Adapters
  | "cqrs"          // CQRS
  | "event_sourcing"
  | "microservices"
  | "rest"
  | "graphql"
  | "scenario";     // Custom scenario-specific

export interface ArchitectureRecord {
  id: string;
  name: string;
  category: ArchitectureCategory;
  description: string;
  /** Best practices / principles (markdown or bullet list) */
  practices: string;
  /** When to use / specific scenarios (markdown or bullet list) */
  scenarios: string;
  /** Optional: references, links, books */
  references?: string;
  /** Optional: anti-patterns to avoid */
  anti_patterns?: string;
  /** Optional: examples, code snippets, diagrams */
  examples?: string;
  /** Optional: custom key-value inputs added by user */
  extra_inputs?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

/** Template shape for selecting and adding to My definitions (no id, created_at, updated_at) */
export interface ArchitectureTemplate {
  name: string;
  category: ArchitectureCategory;
  description: string;
  practices: string;
  scenarios: string;
}
