import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, X, Edit3, MessageSquare } from 'lucide-react';
import { toast } from '../../components/ui/Toast';

export function OcrReportModal({ isOpen, onClose, selectedWord, originalContext }) {
  const [correctedText, setCorrectedText] = useState(selectedWord || '');
  const [correctedPinyin, setCorrectedPinyin] = useState('');
  const [reason, setReason] = useState('Chữ Hán bị nhận diện sai (OCR error)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Send report to server or store locally
      await new Promise((r) => setTimeout(r, 600));
      toast.success('Cảm ơn bạn! Báo lỗi OCR đã được gửi thành công.');
      onClose();
    } catch {
      toast.error('Không thể gửi báo lỗi. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Báo lỗi & Sửa kết quả OCR</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Đóng góp giúp nhận diện chính xác hơn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Từ gốc nhận diện (OCR)
            </label>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 font-serif">
              {selectedWord || 'Chưa chọn từ'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Chữ Hán chính xác
            </label>
            <input
              type="text"
              value={correctedText}
              onChange={(e) => setCorrectedText(e.target.value)}
              placeholder="Nhập chữ Hán đúng..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pinyin chính xác (Tùy chọn)
            </label>
            <input
              type="text"
              value={correctedPinyin}
              onChange={(e) => setCorrectedPinyin(e.target.value)}
              placeholder="Ví dụ: nǐ hǎo..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Loại lỗi
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
            >
              <option value="Chữ Hán bị nhận diện sai (OCR error)">Chữ Hán bị nhận diện sai (OCR error)</option>
              <option value="Tách từ chưa chính xác">Tách từ chưa chính xác</option>
              <option value="Pinyin hoặc nghĩa hiển thị sai">Pinyin hoặc nghĩa hiển thị sai</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi báo lỗi'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
