import { create } from "zustand";

interface RitualModeState {
  isRitualMode: boolean;
  enableRitualMode: () => void;
  disableRitualMode: () => void;
}

export const useRitualModeStore = create<RitualModeState>((set) => ({
  isRitualMode: false,
  enableRitualMode: () => set({ isRitualMode: true }),
  disableRitualMode: () => set({ isRitualMode: false }),
}));
