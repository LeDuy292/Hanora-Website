import { create } from 'zustand';
import * as signalR from '@microsoft/signalr';
import { getCommunityMessages } from '../lib/api';

export const useCommunityChatStore = create((set, get) => ({
  isOpen: false,
  messages: [],
  isConnected: false,
  isLoadingHistory: false,
  hubConnection: null,

  toggleChatbox: () => set((state) => ({ isOpen: !state.isOpen })),

  connectHub: async (token) => {
    if (get().hubConnection) return; // already connected

    const connection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5187/communityhub", {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveMessage', (message) => {
      set((state) => ({
        messages: [...state.messages, message],
      }));
    });

    try {
      await connection.start();
      set({ hubConnection: connection, isConnected: true });
    } catch (error) {
      console.error('SignalR Connection Error: ', error);
    }
  },

  disconnectHub: async () => {
    const { hubConnection } = get();
    if (hubConnection) {
      await hubConnection.stop();
      set({ hubConnection: null, isConnected: false });
    }
  },

  fetchHistory: async () => {
    set({ isLoadingHistory: true });
    try {
      const data = await getCommunityMessages();
      set({ messages: data });
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
