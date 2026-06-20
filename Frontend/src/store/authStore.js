import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, getToken } from '../services/authService';

// UI-only fields the backend does not (yet) track. Kept locally so the
// gamified dashboard/header keep working until those endpoints exist.
const DEFAULT_PROFILE = {
  streak: 0,
  xp: 0,
  level: 'HSK 1',
  targetDailyMinutes: 20,
  todayMinutes: 0,
  isPro: false,
  preferences: {
    darkMode: false,
    interfaceLanguage: 'English',
    pronunciationSpeed: 'Normal',
    dailyGoalMinutes: 30,
    defaultFlashcardMode: 'Flashcard (Q -> A)',
  },
};

/**
 * Maps a backend UserDto ({ id, username, email, displayName, avatarUrl, createdAt })
 * onto the shape the frontend UI consumes, preserving any existing local UI state.
 */
function mapUser(dto, prev = {}) {
  if (!dto) return null;
  return {
    ...DEFAULT_PROFILE,
    ...prev,
    id: dto.id,
    username: dto.username,
    email: dto.email,
    name: dto.displayName || dto.username || dto.email,
    avatar: dto.avatarUrl || null,
    joinedDate: dto.createdAt
      ? new Date(dto.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })
      : prev.joinedDate,
    preferences: { ...DEFAULT_PROFILE.preferences, ...(prev.preferences || {}) },
  };
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // --- Auth actions (all return a boolean success flag) ---
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await authApi.login(email, password);
          set({ user: mapUser(user, get().user || {}), isAuthenticated: true, isLoading: false });
          return true;
        } catch (err) {
          set({ error: err.message, isLoading: false, isAuthenticated: false });
          return false;
        }
      },

      register: async (username, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await authApi.register(username, email, password);
          set({ user: mapUser(user), isAuthenticated: true, isLoading: false });
          return true;
        } catch (err) {
          set({ error: err.message, isLoading: false, isAuthenticated: false });
          return false;
        }
      },

      googleLogin: async (idToken) => {
        set({ isLoading: true, error: null });
        try {
          const { user } = await authApi.googleLogin(idToken);
          set({ user: mapUser(user, get().user || {}), isAuthenticated: true, isLoading: false });
          return true;
        } catch (err) {
          set({ error: err.message, isLoading: false, isAuthenticated: false });
          return false;
        }
      },

      logout: () => {
        authApi.logout();
        set({ user: null, isAuthenticated: false, error: null });
      },

      clearError: () => set({ error: null }),

      // Re-validate the persisted token against the backend on app load.
      // If the token is missing or rejected, drop the session.
      hydrate: async () => {
        if (!getToken()) {
          set({ user: null, isAuthenticated: false });
          return;
        }
        try {
          await authApi.me();
          set({ isAuthenticated: true });
        } catch {
          authApi.logout();
          set({ user: null, isAuthenticated: false });
        }
      },

      // --- Local UI profile helpers (unchanged behaviour) ---
      updateProfile: (updatedData) => set((state) => ({
        user: state.user ? { ...state.user, ...updatedData } : null,
      })),

      updatePreferences: (updatedPrefs) => set((state) => ({
        user: state.user ? {
          ...state.user,
          preferences: {
            ...(state.user.preferences || DEFAULT_PROFILE.preferences),
            ...updatedPrefs,
          },
        } : null,
      })),

      addXp: (amount) => set((state) => {
        if (!state.user) return {};
        const newXp = (state.user.xp || 0) + amount;
        let level;
        if (newXp > 800) level = 'HSK 4';
        else if (newXp > 500) level = 'HSK 3';
        else if (newXp > 200) level = 'HSK 2';
        else level = 'HSK 1';
        return { user: { ...state.user, xp: newXp, level } };
      }),

      incrementStudyTime: (minutes) => set((state) => {
        if (!state.user) return {};
        return { user: { ...state.user, todayMinutes: (state.user.todayMinutes || 0) + minutes } };
      }),

      incrementStreak: () => set((state) => {
        if (!state.user) return {};
        return { user: { ...state.user, streak: (state.user.streak || 0) + 1 } };
      }),
    }),
    {
      name: 'hanora-auth-storage',
      // Token lives in its own localStorage key; only persist UI state here.
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
