import { create } from "zustand";

export interface ActiveTimer {
  id: string;
  taskId: string;
  taskTitle: string;
  projectTitle?: string | null;
  startedAt: Date;
}

interface TimerState {
  // Active timer info (from database)
  activeTimer: ActiveTimer | null;
  // Local elapsed seconds (updated every second)
  elapsedSeconds: number;
  // Loading state
  isLoading: boolean;
  // Interval ID for cleanup
  intervalId: NodeJS.Timeout | null;

  // Actions
  setActiveTimer: (timer: ActiveTimer | null) => void;
  setElapsedSeconds: (seconds: number) => void;
  incrementElapsedSeconds: () => void;
  setIsLoading: (loading: boolean) => void;
  startLocalTimer: () => void;
  stopLocalTimer: () => void;
  reset: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  activeTimer: null,
  elapsedSeconds: 0,
  isLoading: true,
  intervalId: null,

  setActiveTimer: (timer) => {
    const state = get();
    // Stop any existing interval
    if (state.intervalId) {
      clearInterval(state.intervalId);
    }

    if (timer) {
      // Calculate elapsed seconds from start time
      const elapsed = Math.floor(
        (Date.now() - timer.startedAt.getTime()) / 1000
      );
      set({
        activeTimer: timer,
        elapsedSeconds: elapsed,
        intervalId: null,
      });
    } else {
      set({
        activeTimer: null,
        elapsedSeconds: 0,
        intervalId: null,
      });
    }
  },

  setElapsedSeconds: (seconds) => set({ elapsedSeconds: seconds }),

  incrementElapsedSeconds: () =>
    set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),

  setIsLoading: (loading) => set({ isLoading: loading }),

  startLocalTimer: () => {
    const state = get();
    // Clear any existing interval
    if (state.intervalId) {
      clearInterval(state.intervalId);
    }

    // Start new interval
    const intervalId = setInterval(() => {
      get().incrementElapsedSeconds();
    }, 1000);

    set({ intervalId });
  },

  stopLocalTimer: () => {
    const state = get();
    if (state.intervalId) {
      clearInterval(state.intervalId);
      set({ intervalId: null });
    }
  },

  reset: () => {
    const state = get();
    if (state.intervalId) {
      clearInterval(state.intervalId);
    }
    set({
      activeTimer: null,
      elapsedSeconds: 0,
      isLoading: false,
      intervalId: null,
    });
  },
}));
