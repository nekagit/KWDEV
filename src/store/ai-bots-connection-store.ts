"use client";

/**
 * Persists AI Bots page connection (sessionId, botPath, botName) across navigation
 * so the connection stays when leaving and returning to the AI Bots page.
 */

import { create } from "zustand";

interface AiBotsConnectionState {
  sessionId: string | null;
  botPath: string;
  botName: string;
  connectedLabel: string | null;
  setConnection: (sessionId: string, botPath: string, botName: string, connectedLabel?: string | null) => void;
  clearConnection: () => void;
}

export const useAiBotsConnectionStore = create<AiBotsConnectionState>((set) => ({
  sessionId: null,
  botPath: "",
  botName: "zeroclaw",
  connectedLabel: null,
  setConnection: (sessionId, botPath, botName, connectedLabel) =>
    set({ sessionId, botPath, botName, connectedLabel: connectedLabel ?? null }),
  clearConnection: () =>
    set({ sessionId: null, botPath: "", botName: "zeroclaw", connectedLabel: null }),
}));
