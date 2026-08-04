import React, { useState } from 'react';
import { X, FileText, Folder, Check } from 'lucide-react';
import { useDocumentStore } from '../store/documentStore';
import { useToastStore } from '../store/toastStore';

export default function CreateDocModal({ isOpen, onClose, onCreated, activeFolderId = null }) {
  const { addDocument, folders } = useDocumentStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState(activeFolderId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      useToastStore.getState().addToast('Vui lòng nhập tên tài liệu.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdDoc = addDocument(title.trim(), content.trim(), selectedFolderId || null);
      useToastStore.getState().addToast('Đã tạo tài liệu mới thành công!', 'success');
      setTitle('');
      setContent('');
      onClose();
      if (onCreated && createdDoc) {
        onCreated(createdDoc);
      }
    } catch (err) {
      console.error(err);
      useToastStore.getState().addToast('Không thể tạo tài liệu. Vui lòng thử lại.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 relative flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Tạo tài liệu / Ghi chú mới</h2>
            <p className="text-xs text-slate-500">Tạo trang tài liệu mới để tra cứu hoặc soạn thảo văn bản tiếng Trung</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Document Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên tài liệu <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Nhật ký học tiếng Trung, Bài đọc HSK 4..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Folder selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-slate-400" />
              Thư mục lưu trữ
            </label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
            >
              <option value="">-- Chọn thư mục (Không xếp) --</option>
              {(folders || []).map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Content TextArea */}
          <div className="flex-1 flex flex-col">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nội dung văn bản (Ghi chú / Tiếng Trung)
            </label>
            <textarea
              rows={6}
              placeholder="Nhập hoặc dán đoạn văn bản tiếng Trung bạn muốn lưu trữ và tra cứu tại đây..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none font-sans"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Tạo tài liệu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
