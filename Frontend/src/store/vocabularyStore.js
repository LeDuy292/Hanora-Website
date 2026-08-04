import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from '../services/apiClient';
import { extractPlainMeaning } from '../utils/chineseUtils';

const INITIAL_VOCABULARY = [];

const cleanTranslation = (val) => extractPlainMeaning(val);

export const useVocabularyStore = create(
  persist(
    (set, get) => ({
      vocabList: INITIAL_VOCABULARY,
      isLoading: false,
      quizLoading: false,
      quizSession: null,
      sessionSavedCount: 0,
      pendingMilestonePrompt: null,

      clearMilestonePrompt: () => set({ pendingMilestonePrompt: null }),
      triggerManualMilestonePrompt: (count = 10, docTitle = '') => set({ pendingMilestonePrompt: { count, docTitle } }),

      isWordSaved: (text) => {
        const normalizedText = (text || '').trim();
        return get().vocabList.some(item => (item.text || '').trim() === normalizedText);
      },

      addWord: async (word) => {
        const normalizedText = (word?.text || '').trim();
        const duplicateMessage = 'Từ vựng này đã được lưu trong sổ tay từ vựng trước đây!';
        if (!normalizedText) {
          throw new Error('Từ vựng không hợp lệ.');
        }

        if (get().isWordSaved(normalizedText)) {
          return {
            success: true,
            alreadyExists: true,
            message: duplicateMessage
          };
        }

        let saveResult;
        try {
          saveResult = await apiRequest(`/vocabulary/${encodeURIComponent(normalizedText)}/save`, {
            method: 'POST',
            body: {
              documentId: word.documentId,
              customDefinition: word.translation,
              pinyin: word.pinyin,
              hanViet: word.hanViet,
              wordType: word.wordType,
              pageNumber: word.pageNumber,
              personalNote: word.personalNote
            },
            auth: true
          });
        } catch (error) {
          console.error("Error saving word to server:", error);
          throw error;
        }

        if (saveResult?.alreadyExists) {
          return {
            ...saveResult,
            message: saveResult.message || duplicateMessage
          };
        }

        const newWord = {
          id: saveResult?.userVocabularyId,
          userVocabularyId: saveResult?.userVocabularyId,
          text: normalizedText,
          pinyin: word.pinyin || "",
          translation: cleanTranslation(word.translation || word.meaning || ""),
          hsk: word.hsk || 1,
          documentTitle: word.documentTitle,
          documentId: word.documentId,
          dateAdded: new Date().toISOString().split('T')[0],
          difficulty: "medium",
          srsLevel: 0,
          nextReviewDate: new Date().toISOString().split('T')[0]
        };

        set((state) => {
          const newSessionCount = (state.sessionSavedCount || 0) + 1;
          // Trigger milestone prompt at 5, 10, 15, 20... words saved
          const isMilestone = newSessionCount === 5 || newSessionCount === 10 || newSessionCount === 15 || (newSessionCount > 0 && newSessionCount % 10 === 0);
          return {
            vocabList: [newWord, ...state.vocabList],
            sessionSavedCount: newSessionCount,
            pendingMilestonePrompt: isMilestone ? { count: newSessionCount, docTitle: word.documentTitle } : state.pendingMilestonePrompt
          };
        });

        return saveResult || {
          success: true,
          created: true,
          message: 'Đã lưu vào sổ tay thành công.'
        };
      },

      createQuickDeckFromRecent: async (count = 10) => {
        const recentWords = get().vocabList.slice(0, count);
        if (!recentWords || recentWords.length === 0) return null;

        const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const name = `⚡ Ôn tập ${recentWords.length} từ vừa lưu (${timeStr})`;
        const description = `Bộ thẻ tự động lưu ${recentWords.length} từ vựng bạn vừa thêm trong bài đọc.`;

        try {
          const deck = await apiRequest('/flashcard/deck', {
            method: 'POST',
            body: { name, description },
            auth: true
          });

          if (deck && deck.id) {
            for (const w of recentWords) {
              const vocabId = w.userVocabularyId || w.id;
              if (vocabId) {
                try {
                  await apiRequest(`/flashcard/deck/${deck.id}/add-word`, {
                    method: 'POST',
                    body: { userVocabularyId: vocabId },
                    auth: true
                  });
                } catch (e) {}
              }
            }
          }
          return deck;
        } catch (err) {
          console.error("Error creating quick deck from recent words:", err);
          return null;
        }
      },

      removeWord: (text) => set((state) => ({
        vocabList: state.vocabList.filter(item => item.text !== text)
      })),

      deleteVocabulary: async (id, options = {}) => {
        const result = await apiRequest('/vocabulary/' + id, {
          method: 'DELETE',
          body: { deleteFlashcards: Boolean(options.deleteFlashcards) },
          auth: true
        });

        set((state) => ({
          vocabList: state.vocabList.filter(item => String(item.userVocabularyId ?? item.id) !== String(id))
        }));

        return result;
      },

      deleteVocabularies: async (ids, options = {}) => {
        const normalizedIds = [...new Set(ids.map(Number).filter(Boolean))];
        if (normalizedIds.length === 0) return null;

        const result = await apiRequest('/vocabulary', {
          method: 'DELETE',
          body: {
            ids: normalizedIds,
            deleteFlashcards: Boolean(options.deleteFlashcards)
          },
          auth: true
        });

        const idSet = new Set(normalizedIds.map(String));
        set((state) => ({
          vocabList: state.vocabList.filter(item => !idSet.has(String(item.userVocabularyId ?? item.id)))
        }));

        return result;
      },
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

      startQuiz: async (config = {}) => {
        set({ quizLoading: true });
        // config: { questionCount, questionTypes: [], difficulty }
        const body = {
          questionCount: config.questionCount ?? 10,
          questionTypes: config.questionTypes ?? [],
          difficulty: config.difficulty ?? 'medium',
          deckId: config.deckId
        };
        try {
          const session = await apiRequest(`/practice/start`, {
            method: 'POST',
            body,
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

      flagQuestion: async (questionId, flagged) => {
        try {
          await apiRequest(`/practice/flag`, {
            method: 'POST',
            body: { questionId, flagged },
            auth: true
          });
          return true;
        } catch (error) {
          console.error("Error flagging question:", error);
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

      fetchQuizResult: async (sessionId) => {
        try {
          return await apiRequest(`/practice/result/${sessionId}`, { auth: true });
        } catch (error) {
          console.error("Error fetching quiz result:", error);
          return null;
        }
      },

      fetchQuizHistory: async () => {
        try {
          return await apiRequest(`/practice/history`, { auth: true });
        } catch (error) {
          console.error("Error fetching quiz history:", error);
          return [];
        }
      },

      fetchInProgressQuiz: async () => {
        try {
          // 204 No Content => apiRequest resolves to null/empty
          return await apiRequest(`/practice/in-progress`, { auth: true });
        } catch (error) {
          console.error("Error fetching in-progress quiz:", error);
          return null;
        }
      },

      fetchUserFlashcards: async (deckId = null) => {
        set({ quizLoading: true });
        try {
          const path = deckId ? `/flashcard?deckId=${deckId}` : '/flashcard';
          const data = await apiRequest(path, { auth: true });
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
      },

      fetchDecks: async (search = null, filter = null, sort = null) => {
        try {
          let path = '/flashcard/decks';
          const params = [];
          if (search) params.push(`search=${encodeURIComponent(search)}`);
          if (filter) params.push(`filter=${encodeURIComponent(filter)}`);
          if (sort) params.push(`sort=${encodeURIComponent(sort)}`);
          if (params.length > 0) {
            path += '?' + params.join('&');
          }
          return await apiRequest(path, { auth: true });
        } catch (error) {
          console.error("Error fetching decks:", error);
          return [];
        }
      },

      createDeck: async (name, source = null, documentId = null) => {
        try {
          return await apiRequest('/flashcard/decks', {
            method: 'POST',
            body: { name, source, documentId },
            auth: true
          });
        } catch (error) {
          console.error("Error creating deck:", error);
          throw error;
        }
      },

      bulkAddCards: async ({ deckId, newDeckName, source, documentId, words }) => {
        try {
          return await apiRequest('/flashcard/decks/bulk-add', {
            method: 'POST',
            body: { deckId, newDeckName, source, documentId, words },
            auth: true
          });
        } catch (error) {
          console.error("Error bulk adding cards:", error);
          throw error;
        }
      },

      completeFlashcardSession: async ({ deckId, cardsStudied, knowCount, completedDeck, completedWithoutInterruption }) => {
        try {
          return await apiRequest('/flashcard/session/complete', {
            method: 'POST',
            body: { deckId, cardsStudied, knowCount, completedDeck, completedWithoutInterruption },
            auth: true
          });
        } catch (error) {
          console.error("Error completing flashcard session:", error);
        }
      },

      createFlashcardSet: async (flashcardName, description, documentId, listVocabularyIds) => {
        try {
          return await apiRequest('/flashcards', {
            method: 'POST',
            body: { flashcardName, description, documentId, listVocabularyIds },
            auth: true
          });
        } catch (error) {
          console.error("Error creating flashcard set:", error);
          throw error;
        }
      },

      updateDeck: async (deckId, name, description) => {
        try {
          return await apiRequest(`/flashcard/decks/${deckId}`, {
            method: 'PUT',
            body: { name, description },
            auth: true
          });
        } catch (error) {
          console.error("Error updating deck:", error);
          throw error;
        }
      },

      deleteDeck: async (deckId) => {
        try {
          return await apiRequest(`/flashcard/decks/${deckId}`, {
            method: 'DELETE',
            auth: true
          });
        } catch (error) {
          console.error("Error deleting deck:", error);
          throw error;
        }
      },

      removeCardFromDeck: async (cardId) => {
        try {
          return await apiRequest(`/flashcard/cards/${cardId}`, {
            method: 'DELETE',
            auth: true
          });
        } catch (error) {
          console.error("Error removing card from deck:", error);
          throw error;
        }
      },

      duplicateDeck: async (deckId) => {
        try {
          return await apiRequest(`/flashcard/decks/${deckId}/duplicate`, {
            method: 'POST',
            auth: true
          });
        } catch (error) {
          console.error("Error duplicating deck:", error);
          throw error;
        }
      },

      fetchDashboardStats: async () => {
        try {
          return await apiRequest('/flashcard/dashboard', { auth: true });
        } catch (error) {
          console.error("Error fetching dashboard stats:", error);
          throw error;
        }
      },

      fetchReviewCards: async (deckId = null) => {
        try {
          const path = deckId ? `/flashcard/review?deckId=${deckId}` : '/flashcard/review';
          return await apiRequest(path, { auth: true });
        } catch (error) {
          console.error("Error fetching review cards:", error);
          throw error;
        }
      },

      submitReview: async (flashcardId, result, responseMs) => {
        try {
          return await apiRequest(`/flashcard/review/${flashcardId}`, {
            method: 'POST',
            body: { result, responseMs },
            auth: true
          });
        } catch (error) {
          console.error("Error submitting review:", error);
          throw error;
        }
      },

      fetchWriteCards: async (deckId = null, count = 10) => {
        try {
          const path = deckId ? `/flashcard/write?deckId=${deckId}&count=${count}` : `/flashcard/write?count=${count}`;
          return await apiRequest(path, { auth: true });
        } catch (error) {
          console.error("Error fetching write cards:", error);
          throw error;
        }
      },

      submitWriteAnswer: async (flashcardId, userAnswer) => {
        try {
          return await apiRequest(`/flashcard/write/${flashcardId}`, {
            method: 'POST',
            body: { userAnswer },
            auth: true
          });
        } catch (error) {
          console.error("Error submitting write answer:", error);
          throw error;
        }
      },

      startMatchGame: async (deckId = null, cardCount = 8) => {
        try {
          return await apiRequest('/flashcard/match/start', {
            method: 'POST',
            body: { deckId, cardCount },
            auth: true
          });
        } catch (error) {
          console.error("Error starting match game:", error);
          throw error;
        }
      },

      submitMatchPair: async (matchGameId, flashcardId1, flashcardId2) => {
        try {
          return await apiRequest(`/flashcard/match/${matchGameId}/pair`, {
            method: 'POST',
            body: { flashcardId1, flashcardId2 },
            auth: true
          });
        } catch (error) {
          console.error("Error submitting match pair:", error);
          throw error;
        }
      },

      completeMatchGame: async (matchGameId) => {
        try {
          return await apiRequest(`/flashcard/match/${matchGameId}/complete`, {
            method: 'POST',
            auth: true
          });
        } catch (error) {
          console.error("Error completing match game:", error);
          throw error;
        }
      },

      fetchNotifications: async () => {
        try {
          return await apiRequest('/notifications', { auth: true });
        } catch (error) {
          console.error("Error fetching notifications:", error);
          return [];
        }
      },

      markNotificationAsRead: async (id) => {
        try {
          await apiRequest(`/notifications/${id}/read`, { method: 'POST', auth: true });
        } catch (error) {
          console.error("Error marking notification as read:", error);
        }
      },

      markAllNotificationsAsRead: async () => {
        try {
          await apiRequest('/notifications/read-all', { method: 'POST', auth: true });
        } catch (error) {
          console.error("Error marking all notifications as read:", error);
        }
      }
    }),
    {
      name: 'hanora-vocabulary-storage-v2',
    }
  )
);
