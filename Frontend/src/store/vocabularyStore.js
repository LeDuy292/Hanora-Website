import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from '../services/apiClient';

const INITIAL_VOCABULARY = [];

export const useVocabularyStore = create(
  persist(
    (set, get) => ({
      vocabList: INITIAL_VOCABULARY,
      isLoading: false,
      quizLoading: false,
      quizSession: null,

      isWordSaved: (text) => {
        return get().vocabList.some(item => item.text === text);
      },

      addWord: async (word) => {
        if (get().isWordSaved(word.text)) return;
        
        try {
          await apiRequest(`/vocabulary/${encodeURIComponent(word.text)}/save`, {
            method: 'POST',
            body: { documentId: word.documentId },
            auth: true
          });
        } catch (error) {
          console.error("Error saving word to server:", error);
        }

        const newWord = {
          text: word.text,
          pinyin: word.pinyin || "",
          translation: word.translation || "",
          hsk: word.hsk || 1,
          documentTitle: word.documentTitle,
          documentId: word.documentId,
          dateAdded: new Date().toISOString().split('T')[0],
          difficulty: "medium",
          srsLevel: 0,
          nextReviewDate: new Date().toISOString().split('T')[0]
        };
        
        set((state) => ({
          vocabList: [newWord, ...state.vocabList]
        }));
      },

      removeWord: (text) => set((state) => ({
        vocabList: state.vocabList.filter(item => item.text !== text)
      })),

      reviewWord: async (text, rating) => {
        const today = new Date();
        const state = get();
        const item = state.vocabList.find(i => i.text === text);
        if (!item) return;

        let newSrsLevel;
        let intervalDays;
        
        if (rating === 'easy') {
          newSrsLevel = item.srsLevel + 2;
          intervalDays = Math.max(4, newSrsLevel * 4);
        } else if (rating === 'good') {
          newSrsLevel = item.srsLevel + 1;
          intervalDays = Math.max(2, newSrsLevel * 2);
        } else {
          newSrsLevel = 0;
          intervalDays = 1;
        }
        
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + intervalDays);
        
        const status = newSrsLevel >= 5 ? 'mastered' : (newSrsLevel > 0 ? 'learning' : 'new');
        
        await get().updateServerStatus(text, status, newSrsLevel);

        const updatedList = state.vocabList.map(i => {
          if (i.text !== text) return i;
          return {
            ...i,
            srsLevel: newSrsLevel,
            difficulty: rating === 'easy' ? 'easy' : rating === 'good' ? 'medium' : 'hard',
            nextReviewDate: nextDate.toISOString().split('T')[0]
          };
        });
        
        set({ vocabList: updatedList });
      },

      updateWordSrsLevel: async (text, newSrsLevel) => {
        const status = newSrsLevel >= 5 ? 'mastered' : (newSrsLevel > 0 ? 'learning' : 'new');
        await get().updateServerStatus(text, status, newSrsLevel);

        set((state) => {
          const updatedList = state.vocabList.map(item => {
            if (item.text !== text) return item;
            return {
              ...item,
              srsLevel: newSrsLevel,
              nextReviewDate: new Date().toISOString().split('T')[0]
            };
          });
          return { vocabList: updatedList };
        });
      },

      updateServerStatus: async (wordText, status, masteryLevel) => {
        try {
          await apiRequest('/flashcard/status', {
            method: 'POST',
            body: { word: wordText, status, masteryLevel },
            auth: true
          });
        } catch (error) {
          console.error("Error updating status on server:", error);
        }
      },

      getReviewQueue: () => {
        const todayStr = new Date().toISOString().split('T')[0];
        return get().vocabList.filter(item => item.nextReviewDate <= todayStr);
      },

      startQuiz: async (count = 10) => {
        set({ quizLoading: true });
        try {
          const session = await apiRequest(`/practice/start?count=${count}`, {
            method: 'POST',
            auth: true
          });
          if (session) {
            set({ quizSession: session, quizLoading: false });
            return session;
          }
        } catch (error) {
          console.error("Error generating quiz:", error);
        }
        set({ quizLoading: false });
        return null;
      },

      submitIndividualAnswer: async (answer) => {
        try {
          await apiRequest(`/practice/answer`, {
            method: 'POST',
            body: answer,
            auth: true
          });
          return true;
        } catch (error) {
          console.error("Error submitting individual answer:", error);
          return false;
        }
      },

      finishQuiz: async (sessionId) => {
        set({ quizLoading: true });
        try {
          const session = await apiRequest(`/practice/finish/${sessionId}`, {
            method: 'POST',
            auth: true
          });
          if (session) {
            set({ quizSession: session, quizLoading: false });
            return session;
          }
        } catch (error) {
          console.error("Error finishing quiz:", error);
        }
        set({ quizLoading: false });
        return null;
      },

      fetchUserFlashcards: async () => {
        set({ quizLoading: true });
        try {
          const data = await apiRequest('/flashcard', { auth: true });
          if (data) {
            set({ 
              vocabList: data,
              isLoading: false,
              quizLoading: false
            });
          }
        } catch (error) {
          console.error("Error fetching flashcards:", error);
          set({ isLoading: false, quizLoading: false });
        }
      }
    }),
    {
      name: 'hanora-vocabulary-storage-v2',
    }
  )
);
