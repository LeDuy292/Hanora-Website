import { useToastStore } from '../../store/toastStore';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border backdrop-blur-md min-w-[280px] max-w-[400px] ${
              toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-100 text-emerald-800' :
              toast.type === 'error' ? 'bg-rose-50/95 border-rose-100 text-rose-800' :
              'bg-blue-50/95 border-blue-100 text-blue-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500 shrink-0" />}
            
            <p className="font-bold text-[14px] flex-1 leading-snug">{toast.message}</p>
            
            <button onClick={() => removeToast(toast.id)} className="p-1.5 hover:bg-black/5 rounded-full transition-colors shrink-0">
              <X className="w-4 h-4 opacity-60 hover:opacity-100" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
