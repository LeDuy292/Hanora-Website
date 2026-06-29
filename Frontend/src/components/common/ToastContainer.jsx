import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, X, HelpCircle } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';

export function ToastContainer() {
  const { toasts, removeToast, confirmModal } = useNotificationStore();

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-50/95 border-emerald-200/60 text-emerald-800 shadow-emerald-100/30',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        };
      case 'warning':
        return {
          bg: 'bg-amber-50/95 border-amber-200/60 text-amber-800 shadow-amber-100/30',
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
        };
      case 'error':
        return {
          bg: 'bg-rose-50/95 border-rose-200/60 text-rose-800 shadow-rose-100/30',
          icon: <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
        };
      default:
        return {
          bg: 'bg-blue-50/95 border-blue-200/60 text-blue-800 shadow-blue-100/30',
          icon: <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
        };
    }
  };

  return (
    <>
      {/* Toast notifications stack */}
      <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-3 w-full max-w-[340px] pointer-events-none select-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const styles = getToastStyles(t.type);
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: 10, transition: { duration: 0.15 } }}
                className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-md shadow-lg flex items-start justify-between gap-3 ${styles.bg}`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {styles.icon}
                  <p className="text-xs font-semibold leading-relaxed break-words">{t.message}</p>
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="p-0.5 hover:bg-slate-200/20 active:bg-slate-200/35 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Confirmation Dialog Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={confirmModal.onCancel}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white/95 border border-slate-200/70 backdrop-blur-md max-w-sm w-full rounded-2xl p-6 shadow-2xl z-10 overflow-hidden flex flex-col gap-4 text-center sm:text-left"
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-1.5 flex-grow">
                  <h4 className="text-sm font-bold text-slate-800">{confirmModal.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{confirmModal.message}</p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-1">
                <button
                  onClick={confirmModal.onCancel}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition active:scale-97"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition active:scale-97 shadow-md"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ToastContainer;
