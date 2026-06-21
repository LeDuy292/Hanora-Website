import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const INITIAL_VOCABULARY = [];


export const useVocabularyStore = create(
  persist(
    (set, get) => ({
      vocabList: INITIAL_VOCABULARY,

      isWordSaved: (text) => {
        return get().vocabList.some(item => item.text === text);
      },

      addWord: (word) => set((state) => {
        if (state.vocabList.some(item => item.text === word.text)) {
          return {}; // Already saved
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
          nextReviewDate: new Date().toISOString().split('T')[0] // Review immediately
        };
        
        return {
          vocabList: [newWord, ...state.vocabList]
        };
      }),

      removeWord: (text) => set((state) => ({
        vocabList: state.vocabList.filter(item => item.text !== text)
      })),

      /**
       * Reviews a vocabulary word and computes new Spaced Repetition (SRS) interval
       * @param {string} text - Hanzi of word reviewed
       * @param {'easy'|'good'|'hard'} rating - Learner self-assessment
       */
      reviewWord: (text, rating) => set((state) => {
        const today = new Date();
        
        const updatedList = state.vocabList.map(item => {
          if (item.text !== text) return item;
          
          let newSrsLevel;
          let intervalDays;
          
          if (rating === 'easy') {
            newSrsLevel = item.srsLevel + 2;
            intervalDays = Math.max(4, newSrsLevel * 4);
          } else if (rating === 'good') {
            newSrsLevel = item.srsLevel + 1;
            intervalDays = Math.max(2, newSrsLevel * 2);
          } else { // 'hard' / review again
            newSrsLevel = 0;
            intervalDays = 1; // tomorrow
          }
          
          const nextDate = new Date(today);
          nextDate.setDate(today.getDate() + intervalDays);
          
          return {
            ...item,
            srsLevel: newSrsLevel,
            difficulty: rating === 'easy' ? 'easy' : rating === 'good' ? 'medium' : 'hard',
            nextReviewDate: nextDate.toISOString().split('T')[0]
          };
        });
        
        return { vocabList: updatedList };
      }),

      getReviewQueue: () => {
        const todayStr = new Date().toISOString().split('T')[0];
        return get().vocabList.filter(item => item.nextReviewDate <= todayStr);
      },

      updateWordSrsLevel: (text, newSrsLevel) => set((state) => {
        const updatedList = state.vocabList.map(item => {
          if (item.text !== text) return item;
          
          return {
            ...item,
            srsLevel: newSrsLevel,
            nextReviewDate: new Date().toISOString().split('T')[0]
          };
        });
        
        return { vocabList: updatedList };
      })
    }),
    {
      name: 'hanora-vocabulary-storage-v2',
    }
  )
);
