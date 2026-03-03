"use client";

/**
 * Global server (SSH) connection store — keeps connection state across navigation.
 * When the user connects on the Server page, sessionId and label are stored here
 * so they stay "connected" when leaving and returning to the page.
 * Also drives the small floating terminal (like worker tab): when floatingTerminalSessionId
 * is set, the shell shows ServerFloatingTerminalDialog for that session.
 */

import { create } from "zustand";
import { hasValidSessionId } from "@/lib/server-session";

interface ServerConnectionState {
  sessionId: string | null;
  connectedLabel: string | null;
  setConnection: (sessionId: string, label?: string | null) => void;
  clearConnection: () => void;
  /** When set, the small floating server terminal is shown for this session (worker-style). */
  floatingTerminalSessionId: string | null;
  setFloatingTerminalSessionId: (sessionId: string | null) => void;
  floatingTerminalMinimized: boolean;
  setFloatingTerminalMinimized: (minimized: boolean) => void;
}

export const useServerConnectionStore = create<ServerConnectionState>((set) => ({
  sessionId: null,
  connectedLabel: null,
  setConnection: (sessionId, label) =>
    set(
      hasValidSessionId(sessionId)
        ? { sessionId, connectedLabel: label ?? null }
        : { sessionId: null, connectedLabel: null }
    ),
  clearConnection: () =>
    set({ sessionId: null, connectedLabel: null, floatingTerminalSessionId: null }),
  floatingTerminalSessionId: null,
  setFloatingTerminalSessionId: (sessionId) =>
    set({ floatingTerminalSessionId: sessionId }),
  floatingTerminalMinimized: false,
  setFloatingTerminalMinimized: (minimized) =>
    set({ floatingTerminalMinimized: minimized }),
}));
