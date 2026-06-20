import { Eye, EyeOff, Upload } from 'lucide-react';
import { useReaderStore } from '../../store/readerStore';
import { useDocumentStore } from '../../store/documentStore';

export function ReadingToolbar({ onUploadClick }) {
  const { fontSize, setFontSize, showPinyin, togglePinyin, clearSelection } = useReaderStore();
  const { documents, activeDocumentId, setActiveDocument } = useDocumentStore();

  const handleDocumentChange = (e) => {
    setActiveDocument(e.target.value);
    clearSelection(); // clear any open popup details
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm page-transition">
      {/* File selector dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">Văn bản đọc:</span>
        <div className="flex items-center gap-1.5">
          <select
            value={activeDocumentId || ''}
            onChange={handleDocumentChange}
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3.5 py-2 outline-none focus:border-blue-500 max-w-[200px]"
          >
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title}
              </option>
            ))}
          </select>
          <button
            onClick={onUploadClick}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100/70 text-xs font-bold transition-all shadow-sm"
            title="Tải lên tài liệu mới"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tải file mới</span>
          </button>
        </div>
      </div>

      {/* Reader display controllers */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Toggle Pinyin button */}
        <button
          onClick={togglePinyin}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all duration-200 ${
            showPinyin
              ? 'bg-blue-50 border-blue-200 text-blue-650 font-bold shadow-sm'
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
          }`}
          style={{ color: showPinyin ? '#2563eb' : '' }}
          title={showPinyin ? "Ẩn Pinyin" : "Hiện Pinyin"}
        >
          {showPinyin ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>Pinyin</span>
        </button>

        {/* Font size selectors */}
        <div className="flex items-center bg-slate-50 border border-slate-250/60 rounded-xl p-1">
          <button
            onClick={() => setFontSize(fontSize - 2)}
            disabled={fontSize <= 14}
            className="px-2.5 py-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 text-xs font-bold transition-colors"
            title="Giảm cỡ chữ"
          >
            A-
          </button>
          <span className="px-2.5 text-xs text-slate-700 font-bold border-x border-slate-200">
            {fontSize}px
          </span>
          <button
            onClick={() => setFontSize(fontSize + 2)}
            disabled={fontSize >= 36}
            className="px-2.5 py-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 text-xs font-bold transition-colors"
            title="Tăng cỡ chữ"
          >
            A+
          </button>
        </div>
      </div>
    </div>
  );
}
export default ReadingToolbar;
