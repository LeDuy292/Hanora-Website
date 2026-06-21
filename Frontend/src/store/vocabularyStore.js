import { create } from 'zustand';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5187/api'; // Correct backend port from launchSettings.json

export const useVocabularyStore = create((set, get) => ({
  vocabList: [],
  isLoading: false,
  error: null,

  fetchUserFlashcards: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_BASE_URL}/Flashcard/user/${userId}`);
      
      const mappedList = response.data.map(item => {
        let definitions = [];
        try {
          definitions = typeof item.word.definitions === 'string' 
            ? JSON.parse(item.word.definitions) 
            : item.word.definitions || [];
        } catch (e) {
          console.error("Failed to parse definitions", e);
        }

        let examples = [];
        try {
          examples = typeof item.word.exampleSentences === 'string'
            ? JSON.parse(item.word.exampleSentences)
            : item.word.exampleSentences || [];
        } catch (e) {
          console.error("Failed to parse examples", e);
        }

        return {
          id: item.id,
          text: item.word.text,
          pinyin: item.word.pinyin,
          translation: definitions[0]?.meaning || 'No translation',
          fullDefinitions: definitions,
          hsk: item.word.hsk || 1,
          wordType: item.word.wordType || 'Từ vựng',
          examples: examples,
          flipStatus: item.flipStatus,
          learnStatus: item.learnStatus,
          // Derive srsLevel for UI compatibility
          srsLevel: item.flipStatus === 'know' ? 5 : (item.learnStatus === 'in_progress' ? 2 : 0)
        };
      });

      set({ vocabList: mappedList, isLoading: false });
    } catch (err) {
      console.error("Fetch error:", err);
      set({ error: err.message, isLoading: false });
    }
  },

  reviewWord: async (flashcardId, rating) => {
    // Map rating to backend statuses
    let flipStatus = 'still_learning';
    let learnStatus = 'in_progress';

    if (rating === 'easy' || rating === 'good') {
      flipStatus = 'know';
      learnStatus = 'mastered';
    } else if (rating === 'hard' || rating === 'fail') {
      flipStatus = 'still_learning';
      learnStatus = 'in_progress';
    }

    try {
      await axios.put(`${API_BASE_URL}/Flashcard/${flashcardId}/status`, {
        flipStatus,
        learnStatus
      });

      // Update local state
      set((state) => ({
        vocabList: state.vocabList.map(item => 
          item.id === flashcardId 
            ? { ...item, flipStatus, learnStatus, srsLevel: flipStatus === 'know' ? 5 : 2 } 
            : item
        )
      }));
    } catch (err) {
      console.error("Update error:", err);
    }
  },

  updateWordSrsLevel: async (flashcardId, newSrsLevel) => {
    const flipStatus = newSrsLevel >= 4 ? 'know' : 'still_learning';
    const learnStatus = newSrsLevel >= 4 ? 'mastered' : 'in_progress';

    try {
      await axios.put(`${API_BASE_URL}/Flashcard/${flashcardId}/status`, {
        flipStatus,
        learnStatus
      });

      set((state) => ({
        vocabList: state.vocabList.map(item => 
          item.id === flashcardId 
            ? { ...item, flipStatus, learnStatus, srsLevel: newSrsLevel } 
            : item
        )
      }));
    } catch (err) {
      console.error("Update error:", err);
    }
  },

  toggleFavorite: (text) => set((state) => ({
    vocabList: state.vocabList.map(item => 
      item.text === text ? { ...item, is_favorite: !item.is_favorite } : item
    )
  })),

  removeWord: (text) => set((state) => ({
    vocabList: state.vocabList.filter(item => item.text !== text)
  })),

  isWordSaved: (text) => {
    return get().vocabList.some(v => v.text === text);
  },

  getReviewQueue: () => {
    // Filters words that aren't mastered yet (still_learning status)
    return get().vocabList.filter(v => v.flipStatus === 'still_learning');
  }
}));
