/**
 * Tauri detection and invoke/listen helpers. Used by run-store and components to call Rust commands or fall back to fetch in browser.
 */
/** Detect Tauri at runtime (WebView has __TAURI_INTERNALS__ or __TAURI__) or via env (when dev server is started with NEXT_PUBLIC_IS_TAURI=true). */
function detectTauri(): boolean {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_IS_TAURI === "true";
  const w = window as unknown as { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown };
  return !!(w.__TAURI_INTERNALS__ ?? w.__TAURI__) || process.env.NEXT_PUBLIC_IS_TAURI === "true";
}
export const isTauri = typeof window === "undefined" ? process.env.NEXT_PUBLIC_IS_TAURI === "true" : detectTauri();

type InvokeFn = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
type ListenFn = <T>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>;
type OpenFn = (options?: { directory?: boolean; multiple?: boolean; title?: string }) => Promise<string | string[] | null>;

let tauriInvoke: InvokeFn | undefined;
let tauriListen: ListenFn | undefined;
let tauriOpen: OpenFn | undefined;

const invokeReadyPromise: Promise<void> | null = isTauri
  ? import("@tauri-apps/api/core").then((module) => {
      tauriInvoke = module.invoke;
    })
  : null;
const listenReadyPromise: Promise<void> | null = isTauri
  ? import("@tauri-apps/api/event").then((module) => {
      tauriListen = module.listen;
    })
  : null;
const openReadyPromise: Promise<void> | null = isTauri
  ? import("@tauri-apps/plugin-dialog")
      .then((m: { open: OpenFn }) => {
        tauriOpen = m.open;
      })
      .catch(() => {
        // Fallback when withGlobalTauri: true (dialog exposed on window)
        const w = typeof window !== "undefined" ? (window as unknown as { __TAURI__?: { dialog?: { open: OpenFn } } }) : null;
        if (w?.__TAURI__?.dialog?.open) tauriOpen = w.__TAURI__.dialog.open;
      })
  : null;

if (!isTauri) {
  import("@/lib/noop-tauri-api").then((module) => {
    tauriInvoke = module.invoke;
    tauriListen = module.listen;
    tauriOpen = module.open;
  });
}

const TAURI_API_WAIT_MS = 5000;

/**
 * Payload for Tauri commands that take a single ProjectIdArg.
 * In the built app, the IPC expects the parameter key `projectIdArg` (camelCase of the type);
 * the value is the struct with `projectId` (alias for project_id).
 */
export function projectIdArgPayload(projectId: string | null): { projectIdArg: { projectId: string | null } } {
  return { projectIdArg: { projectId } };
}

/**
 * Payload for Tauri commands that take ProjectIdArgOptional (e.g. get_ideas_list).
 * In the built app, the IPC expects the parameter key `projectIdArgOptional` (camelCase of the type).
 */
export function projectIdArgOptionalPayload(projectId: string | null): {
  projectIdArgOptional: { projectId: string | null };
} {
  return { projectIdArgOptional: { projectId } };
}

/**
 * Payload for run_run_terminal_agent. In the built app, the IPC expects the parameter key `args`.
 * Optional agentMode is forwarded to the script as -M for Cursor CLI --mode= (ask | plan | debug).
 * Optional provider selects "cursor" (default) or "claude" CLI script.
 */
export function runRunTerminalAgentPayload(
  projectPath: string,
  promptContent: string,
  label: string,
  agentMode?: string,
  provider?: string
): { args: { projectPath: string; promptContent: string; label: string; agentMode?: string; provider?: string } } {
  const args: { projectPath: string; promptContent: string; label: string; agentMode?: string; provider?: string } = {
    projectPath,
    promptContent,
    label,
  };
  if (agentMode != null && agentMode !== "") {
    args.agentMode = agentMode;
  }
  if (provider != null && provider !== "" && provider !== "cursor") {
    args.provider = provider;
  }
  return { args };
}

/** Payload for create_plan_ticket. In the built app, the IPC expects the parameter key `args`. */
export function createPlanTicketPayload(payload: {
  project_id: string;
  title: string;
  description?: string | null;
  priority?: string | null;
  feature_name?: string | null;
  milestone_id: number;
  idea_id?: number | null;
  agents?: string | null;
}): { args: typeof payload } {
  return { args: payload };
}

/** Payload for set_plan_kanban_state. In the built app, the IPC expects the parameter key `args`. */
export function setPlanKanbanStatePayload(projectId: string, inProgressIds: string[]): { args: { project_id: string; in_progress_ids: string[] } } {
  return { args: { project_id: projectId, in_progress_ids: inProgressIds } };
}

export const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  if (isTauri && invokeReadyPromise) {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Tauri invoke API load timeout")), TAURI_API_WAIT_MS)
    );
    await Promise.race([invokeReadyPromise, timeout]);
  } else if (!tauriInvoke) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (!tauriInvoke) {
    // #region agent log
    if (typeof fetch !== "undefined") {
      try {
        const { debugIngest: di } = await import("@/lib/debug-ingest");
        di({ sessionId: "c29a12", location: "tauri.ts:invoke", message: "tauriInvoke null", data: { cmd, isTauri }, timestamp: Date.now(), hypothesisId: "H1" }, { "X-Debug-Session-Id": "c29a12" });
      } catch {
        // ignore
      }
    }
    // #endregion
    const msg = `Tauri 'invoke' API not available yet. Command: ${cmd}`;
    console.warn(msg);
    return Promise.reject(new Error(msg));
  }
  return tauriInvoke(cmd, args) as Promise<T>;
};

export const listen = async <T>(event: string, handler: (event: { payload: T }) => void): Promise<() => void> => {
  if (isTauri && listenReadyPromise) {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Tauri listen API load timeout")), TAURI_API_WAIT_MS)
    );
    await Promise.race([listenReadyPromise, timeout]);
  } else if (!tauriListen) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (!tauriListen) {
    console.warn(`Tauri 'listen' API not available yet. Event: ${event}`);
    return Promise.resolve(() => {});
  }
  return tauriListen(event, handler);
};

export const showOpenDirectoryDialog = async (): Promise<string | undefined> => {
  if (isTauri && openReadyPromise) {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Tauri dialog API load timeout")), TAURI_API_WAIT_MS)
    );
    await Promise.race([openReadyPromise, timeout]);
  }
  if (!tauriOpen && typeof window !== "undefined") {
    const w = window as unknown as { __TAURI__?: { dialog?: { open: OpenFn } } };
    if (w.__TAURI__?.dialog?.open) tauriOpen = w.__TAURI__.dialog.open;
  }
  if (!tauriOpen) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!tauriOpen) {
    console.warn("Tauri 'dialog.open' API not available yet.");
    return undefined;
  }

  try {
    const selected = await tauriOpen({
      directory: true,
      multiple: false,
      title: "Select a project repository",
    });

    if (typeof selected === "string") {
      return selected;
    }
    if (Array.isArray(selected) && selected.length > 0) {
      const first = selected[0];
      return typeof first === "string" ? first : undefined;
    }
    return undefined;
  } catch (error) {
    console.error("Error opening directory dialog:", error);
    throw error;
  }
};
