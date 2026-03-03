/**
 * Agent provider switcher: per-project selection of "cursor" or "claude" CLI.
 * Persisted in localStorage keyed by project ID.
 */

export type AgentProvider = "cursor" | "claude" | "gemini";

const STORAGE_PREFIX = "kwcode_agent_provider_";

/** Get the selected agent provider for a project. Defaults to "cursor". */
export function getAgentProvider(projectId: string): AgentProvider {
  if (typeof window === "undefined") return "cursor";
  try {
    const val = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
    if (val === "claude") return "claude";
    if (val === "gemini") return "gemini";
  } catch {
    // localStorage unavailable
  }
  return "cursor";
}

/** Set the agent provider for a project. */
export function setAgentProvider(projectId: string, provider: AgentProvider): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${projectId}`, provider);
  } catch {
    // localStorage unavailable
  }
}
