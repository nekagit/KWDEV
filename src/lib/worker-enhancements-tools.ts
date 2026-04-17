export type WorkerEnhancementToolItem = {
  id: string;
  label: string;
};

export type WorkerEnhancementToolGroup = {
  id: string;
  label: string;
  items: WorkerEnhancementToolItem[];
};

export type WorkerEnhancementToolCategory = {
  id: string;
  label: string;
  groups: WorkerEnhancementToolGroup[];
};

export const WORKER_ENHANCEMENT_TOOL_CATEGORIES: WorkerEnhancementToolCategory[] = [
  {
    id: "code-quality",
    label: "Code Quality",
    groups: [
      {
        id: "code-quality",
        label: "Code Quality",
        items: [
          { id: "deduplication", label: "Deduplication" },
          { id: "type-consolidation", label: "Type Consolidation" },
          { id: "dead-code-removal", label: "Dead Code Removal" },
          { id: "circular-dependencies", label: "Circular Dependencies" },
          { id: "type-strengthening", label: "Type Strengthening" },
          { id: "error-handling-cleanup", label: "Error Handling Cleanup" },
          { id: "deprecated-code-removal", label: "Deprecated Code Removal" },
          { id: "ai-slope-optimization", label: "AI Slope Optimization" },
        ],
      },
    ],
  },
  {
    id: "design-patterns",
    label: "Design Patterns",
    groups: [
      {
        id: "design-patterns",
        label: "Design Patterns",
        items: [
          { id: "singleton", label: "Singleton" },
          { id: "factory", label: "Factory" },
          { id: "observer", label: "Observer" },
          { id: "strategy", label: "Strategy" },
          { id: "template-method", label: "Template Method" },
          { id: "decorator", label: "Decorator" },
          { id: "adapter", label: "Adapter" },
        ],
      },
    ],
  },
  {
    id: "best-practices",
    label: "Best Practices",
    groups: [
      {
        id: "senior-level",
        label: "Senior Level",
        items: [
          { id: "code-readability", label: "Code Readability" },
          { id: "code-maintainability", label: "Code Maintainability" },
          { id: "code-scalability", label: "Code Scalability" },
          { id: "code-security", label: "Code Security" },
        ],
      },
      {
        id: "smart-practices",
        label: "Smart Practices",
        items: [
          { id: "code-reusability", label: "Code Reusability" },
          { id: "code-modularity", label: "Code Modularity" },
          { id: "code-flexibility", label: "Code Flexibility" },
          { id: "code-testability", label: "Code Testability" },
        ],
      },
    ],
  },
  {
    id: "code-smells",
    label: "Code Smells",
    groups: [
      {
        id: "code-smells",
        label: "Code Smells",
        items: [
          { id: "long-method", label: "Long Method" },
          { id: "large-class", label: "Large Class" },
          { id: "switch-statements", label: "Switch Statements" },
          { id: "shotgun-surgery", label: "Shotgun Surgery" },
          { id: "feature-envy", label: "Feature Envy" },
          { id: "inconsistent-naming", label: "Inconsistent Naming" },
        ],
      },
    ],
  },
  {
    id: "code-refactoring",
    label: "Code Refactoring",
    groups: [
      {
        id: "code-refactoring",
        label: "Code Refactoring",
        items: [
          { id: "extract-method", label: "Extract Method" },
          { id: "rename-variable", label: "Rename Variable" },
          { id: "move-method", label: "Move Method" },
          { id: "extract-class", label: "Extract Class" },
          { id: "inline-method", label: "Inline Method" },
          { id: "remove-dead-code", label: "Remove Dead Code" },
        ],
      },
    ],
  },
];

export function getWorkerEnhancementToolIds(): string[] {
  const ids: string[] = [];
  for (const category of WORKER_ENHANCEMENT_TOOL_CATEGORIES) {
    for (const group of category.groups) {
      for (const item of group.items) {
        ids.push(item.id);
      }
    }
  }
  return ids;
}

export function sanitizeWorkerEnhancementToolIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const validIds = new Set(getWorkerEnhancementToolIds());
  return ids.filter((id): id is string => typeof id === "string" && validIds.has(id));
}

export function getWorkerEnhancementToolLabelsByIds(ids: string[]): string[] {
  const byId = new Map<string, string>();
  for (const category of WORKER_ENHANCEMENT_TOOL_CATEGORIES) {
    for (const group of category.groups) {
      for (const item of group.items) {
        byId.set(item.id, item.label);
      }
    }
  }
  return ids.map((id) => byId.get(id)).filter((label): label is string => Boolean(label));
}
