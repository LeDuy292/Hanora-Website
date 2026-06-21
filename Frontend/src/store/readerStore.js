import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { aiService } from '../services/aiService';

export const useReaderStore = create(
  persist(
    (set, get) => ({
      // User Interface Configurations (Persisted)
      theme: 'light',
      fontSize: 20,
      showPinyin: true,

      // UI States (Not persisted - cleared on reload)
      hoveredWord: null,
      selectedWord: null,
      selectedSentence: null,
      sentenceExplanation: null,
      isSentenceLoading: false,

      setTheme: (theme) => set({ theme }),
      setFontSize: (size) => set({ fontSize: Math.max(14, Math.min(36, size)) }),
      togglePinyin: () => set((state) => ({ showPinyin: !state.showPinyin })),
      
      setHoveredWord: (word) => set({ hoveredWord: word }),
      
      setSelectedWord: (word) => set({ selectedWord: word }),
      
      setSelectedSentence: async (sentence) => {
        if (!sentence) {
          set({ selectedSentence: null, sentenceExplanation: null });
          return;
        }
        
        set({ selectedSentence: sentence, isSentenceLoading: true, sentenceExplanation: null });
        
        try {
          const explanation = await aiService.explainGrammar(sentence);
          // Verify that user hasn't switched sentences in the meantime
          if (get().selectedSentence === sentence) {
            set({ sentenceExplanation: explanation, isSentenceLoading: false });
          }
        } catch (error) {
          console.error("Failed to explain grammar:", error);
          if (get().selectedSentence === sentence) {
            set({ sentenceExplanation: "Sorry, failed to analyze the grammar. Please try again.", isSentenceLoading: false });
          }
        }
      },

      clearSelection: () => set({ selectedWord: null, selectedSentence: null, sentenceExplanation: null })
    }),
    {
      name: 'hanora-reader-storage',
      // Only persist visual configurations, not active tooltips
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        showPinyin: state.showPinyin
      })
    }
  )
);
