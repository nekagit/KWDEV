/**
 * Global bot status store — tracks the current bot's running status.
 * Used by sidebar to show status dot and by Overview tab to update it.
 */

import { create } from "zustand";

export type BotStatusType = "running" | "stopped" | "error" | "unknown";

interface BotStatusState {
  status: BotStatusType;
  sessionId: string | null;
  botName: string | null;
  lastUpdate: number | null;
  setBotStatus: (status: BotStatusType, sessionId?: string | null, botName?: string | null) => void;
  setBotSession: (sessionId: string | null) => void;
  clearBotStatus: () => void;
}

export const useBotStatusStore = create<BotStatusState>((set) => ({
  status: "unknown",
  sessionId: null,
  botName: null,
  lastUpdate: null,
  setBotStatus: (status, sessionId, botName) =>
    set({
      status,
      sessionId: sessionId ?? null,
      botName: botName ?? null,
      lastUpdate: Date.now(),
    }),
  setBotSession: (sessionId) => set({ sessionId }),
  clearBotStatus: () =>
    set({
      status: "unknown",
      sessionId: null,
      botName: null,
      lastUpdate: null,
    }),
}));
