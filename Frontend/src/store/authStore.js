import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, getToken } from '../services/authService';
import { setToken } from '../services/apiClient';
import { statsApi } from '../services/statsService';
import { useDocumentStore } from './documentStore';
import { useVocabularyStore } from './vocabularyStore';

// Gamification fields (streak/xp/level/today) are owned by the backend and
// loaded via statsApi.me(). These are only placeholders shown for the brief
// moment before the first stats fetch resolves.
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

// Maps the backend stats DTO onto the flat fields the header/dashboard read.
function mapStats(stats) {
  if (!stats) return {};
  return {
    streak: stats.streak ?? 0,
    longestStreak: stats.longestStreak ?? 0,
    xp: stats.xp ?? 0,
    xpToday: stats.xpToday ?? 0,
    xpThisWeek: stats.xpThisWeek ?? 0,
    level: stats.level || 'HSK 1',
    todayMinutes: stats.todayMinutes ?? 0,
    targetDailyMinutes: stats.targetDailyMinutes ?? 20,
    totalWordsSaved: stats.totalWordsSaved ?? 0,
    totalWordsMastered: stats.totalWordsMastered ?? 0,
    totalDocumentsRead: stats.totalDocumentsRead ?? 0,
    totalQuizzesDone: stats.totalQuizzesDone ?? 0,
    averagePronunciationScore: stats.averagePronunciationScore ?? 0,
    totalPronunciationAttempts: stats.totalPronunciationAttempts ?? 0,
    lastActiveDate: stats.lastActiveDate ?? null,
  };
}

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
    role: dto.role || 'User',
    isAdmin: dto.role === 'Admin',
    isActive: dto.isActive ?? true,
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
          get().refreshStats();
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
          get().refreshStats();
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
          get().refreshStats();
          return true;
        } catch (err) {
          set({ error: err.message, isLoading: false, isAuthenticated: false });
          return false;
        }
      },

      logout: () => {
        authApi.logout();
        set({ user: null, isAuthenticated: false, error: null });
        localStorage.removeItem('hanora-documents-storage');
        localStorage.removeItem('hanora-vocabulary-storage-v2');
        useDocumentStore.setState({ documents: [], activeDocumentId: null });
        useVocabularyStore.setState({ vocabList: [] });
        window.location.href = '/login';
      },

      clearError: () => set({ error: null }),

      // Re-validate the persisted token against the backend on app load.
      // If the token is missing or rejected, drop the session. On success,
      // pull fresh gamification stats (which also advances the daily streak).
      hydrate: async () => {
        if (!getToken()) {
          set({ user: null, isAuthenticated: false });
          return;
        }
        try {
          const userDto = await authApi.me();
          set((state) => ({
            user: mapUser(userDto, state.user || {}),
            isAuthenticated: true,
          }));
          await get().refreshStats();
        } catch {
          authApi.logout();
          set({ user: null, isAuthenticated: false });
        }
      },

      refreshProfile: async () => {
        if (!getToken()) return;
        try {
          const userDto = await authApi.me();
          set((state) => ({
            user: mapUser(userDto, state.user || {}),
          }));
          await get().refreshStats();
        } catch {
          // Non-fatal
        }
      },

      updateProfileOnServer: async (updatedData) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.updateProfile({
            displayName: updatedData.name,
            email: updatedData.email,
            currentPassword: updatedData.currentPassword,
            newPassword: updatedData.newPassword,
            dailyMinutesGoal: updatedData.dailyMinutesGoal,
            avatarUrl: updatedData.avatarUrl
          });
          if (res?.user) {
            set((state) => ({
              user: mapUser(res.user, state.user || {}),
              isLoading: false
            }));
            if (res.token) {
              setToken(res.token);
            }
          }
          await get().refreshStats();
          return { success: true };
        } catch (err) {
          set({ error: err.message, isLoading: false });
          return { success: false, error: err.message };
        }
      },

      // Pulls streak/xp/level/today-minutes from the backend and advances the
      // daily-login streak. Safe to call repeatedly; the streak only moves once
      // per calendar day server-side.
      refreshStats: async () => {
        if (!getToken()) return;
        try {
          const stats = await statsApi.me();
          set((state) => ({
            user: state.user ? { ...state.user, ...mapStats(stats) } : state.user,
          }));
        } catch {
          // Non-fatal: keep whatever stats we already have rather than logging out.
        }
      },

      trackStudyTime: async (minutes) => {
        if (!getToken()) return;
        try {
          await statsApi.trackTime(minutes);
          await get().refreshStats();
        } catch {
          // Non-fatal
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
    }),
    {
      name: 'hanora-auth-storage',
      // Token lives in its own localStorage key; only persist UI state here.
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
