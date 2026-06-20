import { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck, Volume2, Sparkles, X, Loader2 } from 'lucide-react';
import { aiService } from '../../services/aiService';

export function WordPopup({ word, onSave, isSaved, onClose }) {
  const [examples, setExamples] = useState([]);
  const [isLoadingExamples, setIsLoadingExamples] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  // Setup HSK styles in light theme
  const getHskColor = (hsk) => {
    if (hsk === 1) return "bg-emerald-50 text-emerald-600 border-emerald-100";
    if (hsk === 2) return "bg-blue-50 text-blue-600 border-blue-100";
    return "bg-purple-50 text-purple-600 border-purple-100";
  };

  const hskLabel = `HSK ${word.hsk}`;

  // Fetch AI examples when toggled
  useEffect(() => {
    if (showExamples && examples.length === 0) {
      Promise.resolve().then(() => {
        setIsLoadingExamples(true);
      });
      aiService.generateExamples(word.text)
        .then(res => {
          setExamples(res);
          setIsLoadingExamples(false);
        })
        .catch(err => {
          console.error("Failed to generate examples:", err);
          setIsLoadingExamples(false);
        });
    }
  }, [showExamples, word.text, examples.length]);

  // TTS audio trigger using browser API
  const speakWord = (e) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.text);
      utterance.lang = 'zh-CN';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-100 rounded-2xl p-5 shadow-md flex flex-col gap-4 animate-scale-in">
      {/* Header row */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getHskColor(word.hsk)}`}>
            {hskLabel}
          </span>
          <button 
            onClick={speakWord}
            className="text-slate-400 hover:text-blue-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
            title="Nghe phát âm"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-650 p-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main characters lookup */}
      <div className="flex items-baseline gap-3">
        <h3 className="text-4xl font-extrabold text-slate-800 font-display select-text">
          {word.text}
        </h3>
        <p className="text-base font-bold text-blue-650 select-text">
          [{word.pinyin}]
        </p>
      </div>

      {/* Translation */}
      <p className="text-sm text-slate-650 font-medium select-text italic">
        "{word.translation}"
      </p>

      {/* Action triggers */}
      <div className="flex gap-2 border-t border-slate-100 pt-4">
        {/* Save to vocabulary */}
        <button
          onClick={() => onSave(word)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
            isSaved
              ? 'bg-slate-50 text-slate-400 border border-slate-150 cursor-default'
              : 'bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white shadow-sm shadow-blue-500/10 border border-blue-500/20'
          }`}
          disabled={isSaved}
        >
          {isSaved ? (
            <>
              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Đã lưu Sổ tay</span>
            </>
          ) : (
            <>
              <Bookmark className="w-3.5 h-3.5" />
              <span>Lưu vào Sổ tay</span>
            </>
          )}
        </button>

        {/* AI Sentence generator */}
        <button
          onClick={() => setShowExamples(!showExamples)}
          className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all duration-200 ${
            showExamples 
              ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm' 
              : 'bg-slate-100 border-slate-200/60 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Mẫu câu AI</span>
        </button>
      </div>

      {/* AI Examples dropdown container */}
      {showExamples && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 mt-1 space-y-3">
          <div className="text-[10px] font-bold text-amber-600 flex items-center gap-1.5 uppercase tracking-widest">
            <Sparkles className="w-3 h-3 fill-amber-500/5 animate-spin" style={{ animationDuration: '3s' }} />
            Ngữ cảnh sử dụng
          </div>
          {isLoadingExamples ? (
            <div className="flex items-center justify-center py-4 gap-2 text-slate-400 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>AI đang soạn mẫu câu...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {examples.map((ex, idx) => (
                <div key={idx} className="space-y-0.5 text-left border-l-2 border-slate-200 pl-2">
                  <p className="text-xs font-semibold text-slate-800 select-text">{ex.chinese}</p>
                  <p className="text-[10px] text-blue-650 font-bold select-text">{ex.pinyin}</p>
                  <p className="text-[10px] text-slate-500 italic select-text">"{ex.english}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default WordPopup;
