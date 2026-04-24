export type InlinePromptSource = {
  id: string;
  title: string;
  category: string;
  sourcePath: string;
  content: string;
};

export const INLINE_PROMPT_SOURCES: InlinePromptSource[] = [
  {
    id: "generate-ideas-system",
    title: "Ideas Generation Prompt",
    category: "API",
    sourcePath: "src/app/api/generate-ideas/route.ts",
    content: "System prompt used to generate idea suggestions from project context.",
  },
  {
    id: "generate-architectures-system",
    title: "Architecture Generation Prompt",
    category: "API",
    sourcePath: "src/app/api/generate-architectures/route.ts",
    content: "System prompt used to generate architecture proposals from an idea.",
  },
  {
    id: "generate-prompt-system",
    title: "Prompt Generation Prompt",
    category: "API",
    sourcePath: "src/app/api/generate-prompt/route.ts",
    content: "Instruction prompt used for generating prompts from user descriptions.",
  },
  {
    id: "generate-project-from-idea-combined",
    title: "Project From Idea Combined Prompt",
    category: "API",
    sourcePath: "src/app/api/generate-project-from-idea/route.ts",
    content: "Composed runtime prompt for creating full project output from a product idea.",
  },
  {
    id: "generate-ticket-from-prompt-system",
    title: "Ticket From Prompt System Prompt",
    category: "API",
    sourcePath: "src/app/api/generate-ticket-from-prompt/route.ts",
    content: "System prompt used when generating a ticket from a prompt.",
  },
  {
    id: "analyze-project-doc-system",
    title: "Analyze Project Doc System Prompt",
    category: "API",
    sourcePath: "src/app/api/analyze-project-doc/route.ts",
    content: "System instruction used to transform project docs from analysis input.",
  },
  {
    id: "project-run-tab-debug-fallback",
    title: "Debug Assistant Fallback Prompt",
    category: "UI",
    sourcePath: "src/components/organisms/Tabs/ProjectRunTab.tsx",
    content: "Fallback debugging assistant prompt used in run tab flows.",
  },
  {
    id: "project-run-tab-ask-prefix",
    title: "Ask-Only Prompt Prefix",
    category: "UI",
    sourcePath: "src/components/organisms/Tabs/ProjectRunTab.tsx",
    content: "Prefix added for ask-only flows in run tab prompt building.",
  },
  {
    id: "global-project-chat-execution",
    title: "Global Project Chat Execution Prompt",
    category: "UI",
    sourcePath: "src/components/organisms/GlobalProjectChatBubble.tsx",
    content: "Execution prompt template used by the global project chat bubble.",
  },
  {
    id: "idea-upgrade-prompt",
    title: "Idea Upgrade Prompt",
    category: "Library",
    sourcePath: "src/lib/idea-upgrade-prompt.ts",
    content: "Prompt builder used to expand and improve raw project ideas.",
  },
  {
    id: "static-analysis-checklist-prompt",
    title: "Static Analysis Checklist Prompt",
    category: "Library",
    sourcePath: "src/lib/static-analysis-checklist.ts",
    content: "Prompt template for static analysis checklist generation.",
  },
  {
    id: "testing-agent-prompt-fallback",
    title: "Testing Agent Prompt Fallback",
    category: "Library",
    sourcePath: "src/lib/testing-agent-prompt.ts",
    content: "Fallback instruction block for the testing agent loop prompt.",
  },
  {
    id: "worker-agent-prompt-fallback",
    title: "Cleanup Refactor Agent Prompt Fallback",
    category: "Library",
    sourcePath: "src/lib/worker-agent-prompts.ts",
    content: "Fallback prompt intro for cleanup/refactor worker agent runs.",
  },
  {
    id: "worker-enhancements-testing-prompt",
    title: "Worker Enhancements Testing Prompt",
    category: "Library",
    sourcePath: "src/lib/worker-enhancements-testing-prompt.ts",
    content: "Prompt builder for worker enhancement testing passes.",
  },
];
