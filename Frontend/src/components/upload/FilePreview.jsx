import { useState } from 'react';
import { Play, FileText, BookOpen } from 'lucide-react';
import { Button } from '../common/Button';
import { analyzeChineseText } from '../../utils/fileHelper';

export function FilePreview({ file, text, onConfirm, onCancel }) {
  const [title, setTitle] = useState(file.name.replace(/\.[^/.]+$/, "")); // Strip file extension
  const metrics = analyzeChineseText(text);

  const handleConfirm = () => {
    onConfirm(title, text);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 space-y-6 max-w-xl mx-auto shadow-md page-transition">
      {/* Title block */}
      <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-600 shadow-inner">
          <FileText className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Tệp tin đã tải lên</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Đặt tên cho tài liệu..."
            className="w-full bg-transparent text-slate-800 text-base font-bold outline-none border-b border-transparent hover:border-slate-200 focus:border-blue-500 pb-0.5 transition-colors placeholder-slate-400"
          />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Số ký tự</span>
          <span className="text-lg font-bold text-slate-800">{metrics.charCount}</span>
        </div>
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Số từ vựng</span>
          <span className="text-lg font-bold text-slate-800">{metrics.wordCount}</span>
        </div>
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Thời gian đọc</span>
          <span className="text-lg font-bold text-blue-600">{metrics.readTimeMins} phút</span>
        </div>
      </div>

      {/* Text Preview Box */}
      <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-150 pb-2">
          <BookOpen className="w-3.5 h-3.5" /> Nội dung xem trước
        </div>
        <div className="text-xs text-slate-650 leading-relaxed font-sans line-clamp-4 select-none whitespace-pre-wrap">
          {text}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <Button 
          variant="primary" 
          icon={Play}
          onClick={handleConfirm}
          className="flex-1"
        >
          Phân Tách & Đọc Sách
        </Button>
        <Button 
          variant="secondary" 
          onClick={onCancel}
        >
          Hủy Bỏ
        </Button>
      </div>
    </div>
  );
}
export default FilePreview;
