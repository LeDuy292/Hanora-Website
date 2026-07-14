import { useToastStore } from '../../store/toastStore';
import { useNotificationStore } from '../../store/notificationStore';
import { CheckCircle, AlertCircle, Info, X, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const {
    toasts: notificationToasts,
    removeToast: removeNotificationToast,
    confirmModal
  } = useNotificationStore();

  const renderToastIcon = (type) => {
    if (type === 'success') return <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />;
    if (type === 'error') return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
    if (type === 'warning') return <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />;
    return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
  };

  const getToastClassName = (type) => {
    if (type === 'success') return 'bg-emerald-50/95 border-emerald-100 text-emerald-800';
    if (type === 'error') return 'bg-rose-50/95 border-rose-100 text-rose-800';
    if (type === 'warning') return 'bg-amber-50/95 border-amber-100 text-amber-800';
    return 'bg-blue-50/95 border-blue-100 text-blue-800';
  };

  const allToasts = [
    ...toasts.map((toast) => ({ ...toast, source: 'legacy' })),
    ...notificationToasts.map((toast) => ({ ...toast, source: 'notification' }))
  ];

  const dismissToast = (toast) => {
    if (toast.source === 'notification') {
      removeNotificationToast(toast.id);
      return;
    }
    removeToast(toast.id);
  };

  return (
    <>
      <div className="fixed top-6 right-6 z-[99999] flex w-[calc(100vw-2rem)] max-w-[400px] flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {allToasts.map((toast) => (
            <motion.div
              key={toast.source + '-' + toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className={'pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border backdrop-blur-md min-w-0 ' + getToastClassName(toast.type)}
            >
              {renderToastIcon(toast.type)}

              <p className="font-bold text-[14px] flex-1 leading-snug break-words">{toast.message}</p>

              <button onClick={() => dismissToast(toast)} className="p-1.5 hover:bg-black/5 rounded-full transition-colors shrink-0">
                <X className="w-4 h-4 opacity-60 hover:opacity-100" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[99998] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={confirmModal.onCancel}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-6 text-center shadow-2xl sm:text-left"
            >
              <div className="flex flex-col items-center gap-3.5 sm:flex-row sm:items-start">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-extrabold text-slate-900">{confirmModal.title}</h4>
                  <p className="text-sm font-medium leading-relaxed text-slate-500">{confirmModal.message}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={confirmModal.onCancel}
                  className="min-h-11 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
                >
                  {'H\u1ee7y b\u1ecf'}
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="min-h-11 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-500"
                >
                  {'X\u00e1c nh\u1eadn'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
