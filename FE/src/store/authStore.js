import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../api/auth';

const DEFAULT_PREFS = {
  darkMode: false,
  interfaceLanguage: 'English',
  pronunciationSpeed: 'Normal',
  dailyGoalMinutes: 30,
  defaultFlashcardMode: 'Flashcard (Q -> A)',
};

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      googleLogin: async (idToken) => {
        set({ isLoading: true, error: null });
        try {
          const { token, user } = await authApi.googleLogin(idToken);
          localStorage.setItem('hanora-jwt', token);
          set({ token, user: _enrichUser(user), isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { token, user } = await authApi.login(email, password);
          localStorage.setItem('hanora-jwt', token);
          set({ token, user: _enrichUser(user), isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      register: async (username, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { token, user } = await authApi.register(username, email, password);
          localStorage.setItem('hanora-jwt', token);
          set({ token, user: _enrichUser(user), isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem('hanora-jwt');
        set({ user: null, token: null, isAuthenticated: false, error: null });
      },

      clearError: () => set({ error: null }),

      updateProfile: (data) =>
        set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),

      updatePreferences: (prefs) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, preferences: { ...(state.user.preferences || DEFAULT_PREFS), ...prefs } }
            : null,
        })),

      addXp: (amount) =>
        set((state) => {
          if (!state.user) return {};
          const newXp = (state.user.xp || 0) + amount;
          const level = newXp > 800 ? 'HSK 4' : newXp > 500 ? 'HSK 3' : newXp > 200 ? 'HSK 2' : 'HSK 1';
          return { user: { ...state.user, xp: newXp, level } };
        }),

      incrementStudyTime: (minutes) =>
        set((state) => {
          if (!state.user) return {};
          return { user: { ...state.user, todayMinutes: (state.user.todayMinutes || 0) + minutes } };
        }),

      incrementStreak: () =>
        set((state) => {
          if (!state.user) return {};
          return { user: { ...state.user, streak: (state.user.streak || 0) + 1 } };
        }),
    }),
    {
      name: 'hanora-auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Map backend UserDto → frontend user shape
function _enrichUser(user) {
  return {
    ...user,
    // Alias displayName → name for backward compat with existing UI
    name: user.displayName || user.username,
    avatar: user.avatarUrl || null,
    xp: 0,
    streak: 0,
    level: 'HSK 1',
    todayMinutes: 0,
    targetDailyMinutes: 20,
    isPro: false,
    preferences: DEFAULT_PREFS,
    joinedDate: user.createdAt
      ? new Date(user.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Recently',
  };
}
