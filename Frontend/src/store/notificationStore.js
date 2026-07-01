import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  toasts: [],
  confirmModal: null, // { title, message, onConfirm, onCancel }

  addToast: (message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }]
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id)
        }));
      }, duration);
    }
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id)
  })),

  showConfirm: (message, onConfirm, title = 'Xác nhận') => {
    return new Promise((resolve) => {
      set({
        confirmModal: {
          title,
          message,
          onConfirm: () => {
            set({ confirmModal: null });
            if (onConfirm) onConfirm();
            resolve(true);
          },
          onCancel: () => {
            set({ confirmModal: null });
            resolve(false);
          }
        }
      });
    });
  },

  closeConfirm: () => set({ confirmModal: null })
}));

// Export helper shortcuts
export const toast = {
  success: (msg, duration) => useNotificationStore.getState().addToast(msg, 'success', duration),
  warning: (msg, duration) => useNotificationStore.getState().addToast(msg, 'warning', duration),
  error: (msg, duration) => useNotificationStore.getState().addToast(msg, 'error', duration),
  confirm: (msg, onConfirm, title) => useNotificationStore.getState().showConfirm(msg, onConfirm, title)
};
