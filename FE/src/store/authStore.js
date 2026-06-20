import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_USER = {
  name: "Nguyen Minh",
  email: "nguyenminh@gmail.com",
  streak: 8,
  xp: 320,
  level: "HSK 2",
  targetDailyMinutes: 20,
  todayMinutes: 12,
  avatar: null,
  joinedDate: "March 15, 2024",
  isPro: true,
  preferences: {
    darkMode: false,
    interfaceLanguage: "English",
    pronunciationSpeed: "Normal",
    dailyGoalMinutes: 30,
    defaultFlashcardMode: "Flashcard (Q -> A)"
  }
};

export const useAuthStore = create(
  persist(
    (set) => ({
      user: DEFAULT_USER,
      isAuthenticated: false, // Login first
      
      login: (email, name) => set({
        user: {
          ...DEFAULT_USER,
          name: name || "Nguyen Minh",
          email: email || "nguyenminh@gmail.com",
        },
        isAuthenticated: true
      }),
      
      logout: () => set({ user: null, isAuthenticated: false }),
      
      updateProfile: (updatedData) => set((state) => ({
        user: state.user ? { ...state.user, ...updatedData } : null
      })),
      
      updatePreferences: (updatedPrefs) => set((state) => ({
        user: state.user ? {
          ...state.user,
          preferences: {
            ...(state.user.preferences || DEFAULT_USER.preferences),
            ...updatedPrefs
          }
        } : null
      })),
      
      addXp: (amount) => set((state) => {
        if (!state.user) return {};
        const newXp = state.user.xp + amount;
        // Determine HSK level estimate based on XP for fun gamified experience!
        let level;
        if (newXp > 800) level = "HSK 4";
        else if (newXp > 500) level = "HSK 3";
        else if (newXp > 200) level = "HSK 2";
        else level = "HSK 1";
        
        return {
          user: { ...state.user, xp: newXp, level }
        };
      }),
      
      incrementStudyTime: (minutes) => set((state) => {
        if (!state.user) return {};
        return {
          user: {
            ...state.user,
            todayMinutes: state.user.todayMinutes + minutes
          }
        };
      }),
      
      incrementStreak: () => set((state) => {
        if (!state.user) return {};
        return {
          user: {
            ...state.user,
            streak: state.user.streak + 1
          }
        };
      })
    }),
    {
      name: 'hanora-auth-storage',
    }
  )
);
