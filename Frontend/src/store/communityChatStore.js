import { create } from 'zustand';
import * as signalR from '@microsoft/signalr';
import { getCommunityMessages } from '../lib/api';
import { getToken } from '../services/apiClient';

const trimTrailingSlash = (value) => value?.replace(/\/+$/, '');

const isLocalApiRoot = (value) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(value || '');
const isLocalApiBase = (value) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\/?$/i.test(value || '');

const resolveApiRoot = () => {
  const explicitRoot = trimTrailingSlash(import.meta.env.VITE_API_URL);
  if (explicitRoot && (import.meta.env.DEV || !isLocalApiRoot(explicitRoot))) return explicitRoot;

  const apiBase = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL);
  if (apiBase && (import.meta.env.DEV || !isLocalApiBase(apiBase))) return apiBase.replace(/\/api$/i, '');

  return import.meta.env.DEV ? 'http://localhost:5187' : window.location.origin;
};

const COMMUNITY_HUB_URL = `${resolveApiRoot()}/communityhub`;

const getMessageKey = (message) => {
  if (message?.id != null) return String(message.id);
  return [message?.senderId, message?.createdAt, message?.content].filter(Boolean).join('|');
};

const mergeMessages = (current, incoming) => {
  const seen = new Set(current.map(getMessageKey));
  const next = [...current];

  for (const message of Array.isArray(incoming) ? incoming : [incoming]) {
    const key = getMessageKey(message);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(message);
  }

  return next;
};

export const useCommunityChatStore = create((set, get) => ({
  isOpen: false,
  messages: [],
  isConnected: false,
  isConnecting: false,
  isLoadingHistory: false,
  hubConnection: null,
  connectionError: '',

  toggleChatbox: () => set((state) => ({ isOpen: !state.isOpen })),

  connectHub: async () => {
    const state = get();
    if (state.hubConnection || state.isConnecting) return;

    const token = getToken();
    if (!token) {
      set({ connectionError: 'Bạn cần đăng nhập lại để dùng chat cộng đồng.', isConnected: false });
      return;
    }

    set({ isConnecting: true, connectionError: '' });

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(COMMUNITY_HUB_URL, {
        accessTokenFactory: () => getToken() || '',
      })
      .withAutomaticReconnect()
      .configureLogging(import.meta.env.DEV ? signalR.LogLevel.Information : signalR.LogLevel.Warning)
      .build();

    connection.on('ReceiveMessage', (message) => {
      set((state) => ({
        messages: mergeMessages(state.messages, message),
      }));
    });

    connection.onreconnecting(() => set({ isConnected: false }));
    connection.onreconnected(() => set({ isConnected: true, connectionError: '' }));
    connection.onclose(() => set({ hubConnection: null, isConnected: false, isConnecting: false }));

    try {
      await connection.start();
      set({ hubConnection: connection, isConnected: true, isConnecting: false, connectionError: '' });
    } catch (error) {
      console.error('SignalR Connection Error: ', error);
      set({
        hubConnection: null,
        isConnected: false,
        isConnecting: false,
        connectionError: 'Không thể kết nối chat cộng đồng. Vui lòng kiểm tra đăng nhập hoặc cấu hình server.',
      });
    }
  },

  disconnectHub: async () => {
    const { hubConnection } = get();
    if (hubConnection) {
      await hubConnection.stop();
    }
    set({ hubConnection: null, isConnected: false, isConnecting: false });
  },

  fetchHistory: async () => {
    set({ isLoadingHistory: true });
    try {
      const data = await getCommunityMessages();
      set((state) => ({ messages: mergeMessages(data || [], state.messages) }));
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      set({ isLoadingHistory: false });
    }
  },

  sendMessage: async (content) => {
    const { hubConnection, isConnected } = get();
    if (hubConnection && isConnected) {
      try {
        await hubConnection.invoke('SendMessage', content);
      } catch (error) {
        console.error('SendMessage Error: ', error);
      }
    } else {
      console.error('Cannot send message, SignalR not connected');
    }
  }
}));
