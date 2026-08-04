import { create } from 'zustand';
import { statsApi } from '../services/statsService';
import { useAuthStore } from './authStore';

let globalTimerInterval = null;

export const useTimerStore = create((set, get) => ({
  timerState: 'inactive', // 'inactive' | 'running' | 'paused'
  elapsedSeconds: 0,

  startTimer: () => {
    const { timerState } = get();
    if (timerState === 'running') return;

    set({ timerState: 'running' });

    if (globalTimerInterval) clearInterval(globalTimerInterval);
    globalTimerInterval = setInterval(() => {
      set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
    }, 1000);
  },

  pauseTimer: () => {
    const { timerState } = get();
    if (timerState !== 'running') return;

    if (globalTimerInterval) {
      clearInterval(globalTimerInterval);
      globalTimerInterval = null;
    }
    set({ timerState: 'paused' });
  },

  resumeTimer: () => {
    const { timerState } = get();
    if (timerState !== 'paused') return;

    set({ timerState: 'running' });

    if (globalTimerInterval) clearInterval(globalTimerInterval);
    globalTimerInterval = setInterval(() => {
      set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
    }, 1000);
  },

  resetTimer: () => {
    if (globalTimerInterval) {
      clearInterval(globalTimerInterval);
      globalTimerInterval = null;
    }
    set({ timerState: 'inactive', elapsedSeconds: 0 });
  },

  finishTimer: async (onSuccess) => {
    const { elapsedSeconds, timerState } = get();
    if (timerState === 'inactive') return false;

    if (globalTimerInterval) {
      clearInterval(globalTimerInterval);
      globalTimerInterval = null;
    }

    const minutesToTrack = Math.round(elapsedSeconds / 60);
    set({ timerState: 'inactive', elapsedSeconds: 0 });

    if (minutesToTrack >= 1) {
      try {
        await statsApi.trackTime(minutesToTrack);
        await useAuthStore.getState().refreshStats();
        if (onSuccess) onSuccess(minutesToTrack);
        return true;
      } catch (err) {
        console.error('Error logging study timer duration:', err);
        throw err;
      }
    }
    return false;
  }
}));

// Listen to visibilitychange globally to auto-pause when tab/app goes to background
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      const state = useTimerStore.getState();
      if (state.timerState === 'running') {
        state.pauseTimer();
      }
    }
  });
}
