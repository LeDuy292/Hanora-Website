import { create } from 'zustand';
import { 
  getChatSessions, 
  getChatMessages, 
  createChatSession, 
  sendChatMessage, 
  renameChatSession, 
  togglePinChatSession, 
  deleteChatSession 
} from '../lib/api';

export const useChatStore = create((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  isLoadingSessions: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  isOpen: false,

  toggleChatbox: () => set((state) => ({ isOpen: !state.isOpen })),
  setIsOpen: (isOpen) => set({ isOpen }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId, messages: [] }),

  fetchSessions: async () => {
    set({ isLoadingSessions: true });
    try {
      const data = await getChatSessions();
      set({ sessions: data || [], isLoadingSessions: false });
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      set({ isLoadingSessions: false });
    }
  },

  fetchMessages: async (sessionId) => {
    if (!sessionId) return;
    set({ isLoadingMessages: true });
    try {
      const data = await getChatMessages(sessionId);
      set({ messages: data || [], isLoadingMessages: false });
    } catch (error) {
      console.error('Error fetching messages:', error);
      set({ isLoadingMessages: false });
    }
  },

  startNewSession: async (title = 'Hội thoại mới') => {
    set({ isLoadingMessages: true });
    try {
      const newSession = await createChatSession(title);
      set((state) => ({
        sessions: [newSession, ...state.sessions],
        activeSessionId: newSession.id,
        messages: [],
        isLoadingMessages: false
      }));
      return newSession.id;
    } catch (error) {
      console.error('Error starting new session:', error);
      set({ isLoadingMessages: false });
      return null;
    }
  },

  sendMessage: async (content, activeDocContext = null) => {
    const { activeSessionId } = get();
    let currentSessionId = activeSessionId;

    if (!currentSessionId) {
      // Start a new session if none is active
      currentSessionId = await get().startNewSession();
      if (!currentSessionId) return;
    }

    // Append temporary user message locally first
    const tempUserMsg = {
      id: Date.now(),
      sessionId: currentSessionId,
      role: 'user',
      content: content,
      createdAt: new Date().toISOString()
    };

    set((state) => ({
      messages: [...state.messages, tempUserMsg],
      isSendingMessage: true
    }));

    try {
      const responseMsg = await sendChatMessage(currentSessionId, content, activeDocContext);
      
      // Update session list title or order
      await get().fetchSessions();

      set((state) => ({
        messages: state.messages.map(m => m.id === tempUserMsg.id ? tempUserMsg : m).concat(responseMsg),
        isSendingMessage: false
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMsg = {
        id: Date.now() + 1,
        sessionId: currentSessionId,
        role: 'model',
        content: 'Rất tiếc, trợ lý gặp lỗi kết nối. Hãy thử lại sau nhé!',
        createdAt: new Date().toISOString()
      };
      
      set((state) => ({
        messages: [...state.messages, errorMsg],
        isSendingMessage: false
      }));
    }
  },

  renameSession: async (sessionId, newTitle) => {
    try {
      await renameChatSession(sessionId, newTitle);
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, title: newTitle } : s
        )
      }));
    } catch (error) {
      console.error('Error renaming session:', error);
    }
  },

  togglePinSession: async (sessionId, isPinned) => {
    try {
      await togglePinChatSession(sessionId, isPinned);
      set((state) => ({
        sessions: state.sessions
          .map((s) => (s.id === sessionId ? { ...s, isPinned } : s))
          .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
      }));
    } catch (error) {
      console.error('Error pinning session:', error);
    }
  },

  deleteSession: async (sessionId) => {
    try {
      await deleteChatSession(sessionId);
      set((state) => {
        const remaining = state.sessions.filter((s) => s.id !== sessionId);
        const nextActiveId =
          state.activeSessionId === sessionId
            ? remaining.length > 0
              ? remaining[0].id
              : null
            : state.activeSessionId;
        return {
          sessions: remaining,
          activeSessionId: nextActiveId,
          messages: nextActiveId === state.activeSessionId ? state.messages : []
        };
      });
      // reload messages for next active if session list changed active
      const nextId = get().activeSessionId;
      if (nextId) {
        get().fetchMessages(nextId);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }
}));
