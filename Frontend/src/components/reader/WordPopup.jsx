import { useState, useEffect } from 'react';
import { Bookmark, BookmarkCheck, Volume2, Sparkles, X, Loader2, MoreVertical, FileText, AlertCircle } from 'lucide-react';
import { aiService } from '../../services/aiService';
import { useVocabularyStore } from '../../store/vocabularyStore';
import { useToastStore } from '../../store/toastStore';
import { extractPlainMeaning } from '../../utils/chineseUtils';

const getCleanTranslation = (item) => extractPlainMeaning(item?.translation || item?.definitions || item?.meaning);

export function WordPopup({ word, onSave, isSaved: propIsSaved, onClose, onViewOriginalDoc }) {
  const [examples, setExamples] = useState([]);
  const [isLoadingExamples, setIsLoadingExamples] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isWordSaved = useVocabularyStore(state => state.isWordSaved);
  const isAlreadySavedInStore = isWordSaved(word?.text || word?.word);
  const isSaved = propIsSaved || isAlreadySavedInStore;

  // Setup HSK styles in light theme
  const getHskColor = (hsk) => {
    if (hsk === 1) return "bg-emerald-50 text-emerald-600 border-emerald-100";
    if (hsk === 2) return "bg-blue-50 text-blue-600 border-blue-100";
    return "bg-purple-50 text-purple-600 border-purple-100";
  };

  const hskLabel = `HSK ${word.hsk || 1}`;

  // Fetch AI examples when toggled
  useEffect(() => {
    if (showExamples && examples.length === 0) {
      Promise.resolve().then(() => {
        setIsLoadingExamples(true);
        return aiService.getWordExamples(word.text || word.word);
      })
      .then((data) => {
        setExamples(data || []);
      })
      .catch((err) => {
        console.error("Failed to load examples", err);
      })
      .finally(() => {
        setIsLoadingExamples(false);
      });
    }
  }, [showExamples, word, examples.length]);

  // TTS audio trigger using browser API
  const handlePlayAudio = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.text || word.word);
      utterance.lang = 'zh-CN';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSaveWord = () => {
    if (isSaved) {
      useToastStore.getState().addToast('Từ vựng này đã được lưu trước đây trong sổ tay của bạn!', 'info');
      return;
    }
    onSave(word);
  };

  const displayTranslation = getCleanTranslation(word);

  return (
    <div className="w-full bg-white border border-slate-100 rounded-2xl p-5 shadow-md flex flex-col gap-4 animate-scale-in relative">
      {/* Saved Notification Banner */}
      {isSaved && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2 text-xs font-semibold text-amber-800 flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Từ vựng này đã được bạn lưu trước đây trong Sổ tay!</span>
        </div>
      )}

      {/* Header row */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getHskColor(word.hsk)}`}>
            {hskLabel}
          </span>
          <button 
            onClick={handlePlayAudio}
            className="text-slate-400 hover:text-blue-600 p-1 rounded-lg hover:bg-slate-50 transition-colors"
            title="Nghe phát âm"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 relative">
          {/* 3-dots Menu Button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            title="Tùy chọn khác"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-7 z-50 w-44 bg-white rounded-xl border border-slate-200 shadow-lg p-1 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  setShowMenu(false);
                  if (onViewOriginalDoc) onViewOriginalDoc(word);
                  else useToastStore.getState().addToast(`Đang xem vị trí từ "${word.text || word.word}" trong bài gốc`, 'info');
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>Tài liệu gốc</span>
              </button>
            </div>
          )}

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-650 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main characters lookup */}
      <div className="flex items-baseline gap-3">
        <h3 className="text-4xl font-extrabold text-slate-800 font-display select-text">
          {word.text || word.word}
        </h3>
        <p className="text-base font-bold text-blue-650 select-text">
          [{word.pinyin}]
        </p>
      </div>

      {/* Translation */}
      <p className="text-sm text-slate-700 font-bold select-text leading-relaxed">
        "{displayTranslation}"
      </p>

      {/* Action triggers */}
      <div className="flex gap-2 border-t border-slate-100 pt-4">
        {/* Save to vocabulary */}
        <button
          onClick={handleSaveWord}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
            isSaved
              ? 'bg-slate-50 text-slate-500 border border-slate-200 cursor-default'
              : 'bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white shadow-sm shadow-blue-500/10 border border-blue-500/20'
          }`}
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
