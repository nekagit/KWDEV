import type { StateCreator } from "zustand";
import type { RunStore } from "../run-store-types";

export const createNightShiftSlice: StateCreator<RunStore, [], [], Partial<RunStore>> = (set) => ({
  setNightShiftActive: (active) => set({ nightShiftActive: active }),
  setNightShiftReplenishCallback: (cb) => set({ nightShiftReplenishCallback: cb }),
  setNightShiftCircleState: (mode, phase, completed) =>
    set({
      nightShiftCircleMode: mode,
      nightShiftCirclePhase: phase,
      nightShiftCircleCompletedInPhase: completed,
    }),
  incrementNightShiftCircleCompleted: () =>
    set((s) => ({ nightShiftCircleCompletedInPhase: s.nightShiftCircleCompletedInPhase + 1 })),
  setNightShiftIdeaDrivenState: (state) =>
    set({
      nightShiftIdeaDrivenMode: state.mode,
      nightShiftIdeaDrivenIdea: state.idea,
      nightShiftIdeaDrivenTickets: state.tickets,
      nightShiftIdeaDrivenTicketIndex: state.ticketIndex,
      nightShiftIdeaDrivenPhase: state.phase,
      nightShiftIdeaDrivenCompletedInPhase: state.completedInPhase,
      nightShiftIdeaDrivenIdeasQueue: state.ideasQueue,
    }),
  setIdeaDrivenAutoState: (state) =>
    set({
      ideaDrivenAutoPhase: state.phase,
      ideaDrivenPendingMilestones: state.pendingMilestones,
      ideaDrivenCurrentMilestoneIndex: state.currentMilestoneIndex,
      ideaDrivenAllTickets: state.allTickets,
      ideaDrivenCurrentTicketIndex: state.currentTicketIndex,
    }),
  appendIdeaDrivenLog: (message) =>
    set((s) => ({
      ideaDrivenLogs: [
        ...s.ideaDrivenLogs,
        { id: `log-${Date.now()}-${Math.random().toString(36).slice(2)}`, timestamp: new Date().toISOString(), message },
      ],
    })),
  setIdeaDrivenChecklist: (items) => set({ ideaDrivenChecklist: items }),
  setIdeaDrivenChecklistItemStatus: (id, status) =>
    set((s) => ({
      ideaDrivenChecklist: s.ideaDrivenChecklist.map((item) => (item.id === id ? { ...item, status } : item)),
    })),
  clearIdeaDrivenProgress: () => set({ ideaDrivenChecklist: [], ideaDrivenLogs: [] }),
  setIdeaDrivenTicketPhases: (phases) =>
    set((s) => ({
      ideaDrivenTicketPhases: typeof phases === "function" ? phases(s.ideaDrivenTicketPhases) : phases,
    })),
});
