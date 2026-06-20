import { useState, useEffect } from 'react';
import { Sparkles, Languages, X, Loader2, Play } from 'lucide-react';
import { aiService } from '../../services/aiService';

// A lightweight Markdown parser for simple formatting
function parseMarkdown(mdText) {
  if (!mdText) return null;
  const lines = mdText.split('\n');
  return lines.map((line, idx) => {
    // Headers
    if (line.startsWith('### ')) {
      return <h4 key={idx} className="text-sm font-bold text-slate-800 mt-4 mb-2">{line.replace('### ', '')}</h4>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={idx} className="text-base font-bold text-slate-900 mt-5 mb-3">{line.replace('## ', '')}</h3>;
    }
    
    // Simple bullet point list
    const isBullet = line.startsWith('- ');
    const textContent = isBullet ? line.replace('- ', '') : line;
    
    // Split bullet points or paragraphs and format bold text
    return (
      <p 
        key={idx} 
        className={`${isBullet ? 'list-item list-inside pl-2 ml-2' : ''} text-xs text-slate-600 leading-relaxed my-1.5`}
      >
        {textContent.split('**').map((chunk, i) => (
          i % 2 === 1 ? <strong key={i} className="text-blue-600 font-bold">{chunk}</strong> : chunk
        ))}
      </p>
    );
  });
}

export function SentencePopup({ sentence, onClose }) {
  const [translation, setTranslation] = useState('');
  const [explanation, setExplanation] = useState('');
  const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);

  // Fetch translations and breakdowns when sentence changes
  useEffect(() => {
    if (!sentence) return;

    // Defer state updates to bypass synchronous setState in useEffect warning
    Promise.resolve().then(() => {
      setIsLoadingTranslation(true);
      setIsLoadingExplanation(true);
      setTranslation('');
      setExplanation('');
    });

    // Fetch translation
    aiService.translateSentence(sentence)
      .then(res => {
        setTranslation(res);
        setIsLoadingTranslation(false);
      })
      .catch(err => {
        console.error(err);
        setTranslation("Dịch thuật thất bại.");
        setIsLoadingTranslation(false);
      });

    // Fetch grammar breakdown
    aiService.explainGrammar(sentence)
      .then(res => {
        setExplanation(res);
        setIsLoadingExplanation(false);
      })
      .catch(err => {
        console.error(err);
        setExplanation("Không thể phân tích ngữ pháp.");
        setIsLoadingExplanation(false);
      });

  }, [sentence]);

  // TTS audio playback for full sentence
  const speakSentence = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = 'zh-CN';
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!sentence) return null;

  return (
    <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-md flex flex-col gap-6 animate-slide-up page-transition">
      {/* Header control */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-bold text-slate-800">Phân tích câu</h3>
        </div>
        <button 
          onClick={onClose} 
          className="text-slate-400 hover:text-slate-800 p-0.5 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Actual Chinese Sentence */}
      <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="flex justify-between items-start">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ngữ cảnh chữ Hán</span>
          <button 
            onClick={speakSentence}
            className="text-slate-500 hover:text-blue-600 flex items-center gap-1 text-[10px] font-bold bg-white hover:bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 shadow-sm transition-colors"
          >
            <Play className="w-3 h-3 fill-current" /> Đọc to
          </button>
        </div>
        <p className="text-lg font-bold text-slate-850 leading-relaxed font-sans select-text">
          {sentence}
        </p>
      </div>

      {/* Translation Pane */}
      <div className="space-y-2">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <Languages className="w-3 h-3" /> Bản dịch
        </span>
        {isLoadingTranslation ? (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>AI đang dịch câu...</span>
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-700 italic select-text">
            {translation}
          </p>
        )}
      </div>

      {/* AI Grammar Breakdown */}
      <div className="space-y-2 border-t border-slate-100 pt-4 flex-1 overflow-y-auto max-h-64 pr-2">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" /> Phân tích Ngữ pháp AI
        </span>
        {isLoadingExplanation ? (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>AI đang phân tích cấu trúc...</span>
          </div>
        ) : (
          <div className="space-y-1 select-text">
            {parseMarkdown(explanation)}
          </div>
        )}
      </div>
    </div>
  );
}
export default SentencePopup;
