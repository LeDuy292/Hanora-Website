import { useState } from 'react';
import { Volume2, Star } from 'lucide-react';
import { CHINESE_DICTIONARY } from '../../utils/chineseUtils';
import { pinyin as getPinyin } from 'pinyin-pro';

const cleanTranslation = (val) => {
  if (!val) return "";
  let current = val.trim();
  for (let i = 0; i < 5; i++) {
    if (!(current.startsWith("[") && current.endsWith("]")) && !(current.startsWith("{") && current.endsWith("}"))) {
      break;
    }
    try {
      const parsed = JSON.parse(current);
      if (Array.isArray(parsed) && parsed.length > 0) {
        current = parsed[0].meaning || parsed[0].translation || current;
      } else if (parsed && typeof parsed === 'object') {
        current = parsed.meaning || parsed.translation || current;
      } else {
        break;
      }
    } catch (e) {
      break;
    }
  }
  return current;
};

export function Flashcard({ 
  word, 
  isFlipped, 
  onFlip, 
  onFavorite,
  isFavorite,
  showPinyin = true
}) {
  // TTS audio handler
  const speakWord = (e) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.text);
      utterance.lang = 'zh-CN';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (onFavorite) onFavorite(word.text);
  };

  if (!word) return null;

  // Resolve standardized HSK level using the dictionary lookup
  const cleanText = word.text?.trim() || "";
  const dictEntry = CHINESE_DICTIONARY[cleanText];
  const hskLevel = word.hsk || dictEntry?.hsk || null;
  const hskLabel = hskLevel ? `HSK ${hskLevel}` : "Chưa phân loại";
  const hskColorClass = hskLevel 
    ? (hskLevel === 1 ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
       : hskLevel === 2 ? 'bg-blue-50 text-blue-600 border-blue-100'
       : hskLevel === 3 ? 'bg-orange-50 text-orange-600 border-orange-100'
       : 'bg-red-50 text-red-500 border-red-100')
    : 'bg-slate-100 text-slate-500 border-slate-200';

  return (
    <div className="flashcard-main">
      <div className={`flashcard-inner ${isFlipped ? 'is-flipped' : ''}`} onClick={onFlip}>
        
        {/* FRONT FACE */}
        <div className="flashcard-face flashcard-front">
          <div className="card-header">
            <div className="card-header-left">
              <span className={`hsk-badge font-bold px-2 py-0.5 rounded-md border ${hskColorClass}`}>{hskLabel}</span>
              <span className="pos-badge">{word.wordType || word.type || 'Từ vựng'}</span>
            </div>
            <button 
              className={`favorite-btn ${isFavorite ? 'is-favorite' : ''}`} 
              onClick={handleFavoriteClick}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
              {isFavorite ? '★ Yêu thích' : '☆ Chưa yêu thích'}
            </button>
          </div>
          
          <div className="card-content-center">
            <h2 className="main-character">{word.text}</h2>
            {showPinyin && <p className="main-pinyin">{word.pinyin}</p>}
            <button className="audio-btn" onClick={speakWord}>
              <Volume2 className="w-5 h-5" />
              Nghe phát âm
            </button>
          </div>
 
          <div className="front-footer animate-fade-in" style={{ marginTop: 'auto', paddingTop: '2rem', display: 'flex', justifyContent: 'center' }}>
            <span className="touch-indicator" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span>👆 Click hoặc nhấn</span>
              <kbd style={{ padding: '0.125rem 0.375rem', fontSize: '0.6875rem', fontFamily: 'monospace', color: '#64748b', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.375rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>Space</kbd>
              <span>để lật</span>
            </span>
          </div>
        </div>

        {/* BACK FACE */}
        <div className="flashcard-face flashcard-back relative p-8 overflow-y-auto flex flex-col justify-start">
          
          {/* Header section (Character + Pinyin + Hán-Việt) */}
          <div className="back-header border-b border-slate-100 pb-4 mb-6 flex justify-between items-center w-full text-left shrink-0">
            <div className="back-title-group flex items-center gap-4 flex-wrap">
              <h2 className="text-5xl font-black text-slate-800 leading-none">{word.text}</h2>
              {showPinyin && <span className="text-2xl font-bold text-slate-450">[{word.pinyin}]</span>}
              {word.hanViet && (
                <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 font-bold text-xs uppercase tracking-wide">
                  Hán-Việt: {word.hanViet}
                </span>
              )}
            </div>
            
            <div className="back-card-meta flex items-center gap-2 shrink-0">
              <span className={`hsk-badge-small font-bold px-2 py-0.5 rounded border text-[10px] ${hskColorClass}`}>{hskLabel}</span>
              <button className="favorite-btn-minimal" onClick={handleFavoriteClick}>
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
              </button>
              <button className="audio-btn-circle" onClick={speakWord}>
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Vertical list of blocks */}
          <div className="flex flex-col gap-5 w-full text-left">
            
            {/* 1. NGHĨA */}
            <div className="w-full bg-gradient-to-br from-blue-50/60 to-indigo-50/30 border border-blue-100 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-blue-200/40 pb-2 mb-3">
                <span className="text-xs font-black text-blue-700 tracking-wider flex items-center gap-1.5">
                  <span>📖</span> NGHĨA
                </span>
                <span className="text-[10px] font-black px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-md border border-blue-200/50">
                  {word.wordType || word.type || 'Từ vựng'}
                </span>
              </div>
              <div className="text-xl font-black text-blue-900 leading-snug space-y-1.5 pl-1">
                • {cleanTranslation(word.translation || word.meaning)}
                {word.fullDefinitions?.length > 1 && (
                  <div className="additional-meanings mt-2 space-y-1 text-sm font-semibold text-slate-500">
                    {word.fullDefinitions.slice(1).map((d, i) => (
                      <div key={i} className="sub-meaning flex items-start gap-1.5 pl-2">
                        <span className="text-blue-500">•</span>
                        <span>{d.meaning}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2. GIẢI THÍCH CHI TIẾT */}
            <div className="w-full bg-slate-50/40 border border-slate-100 rounded-2xl p-5 shadow-xs">
              <div className="border-b border-slate-200/60 pb-2 mb-3">
                <span className="text-xs font-black text-slate-500 tracking-wider flex items-center gap-1.5">
                  <span>💡</span> GIẢI THÍCH CHI TIẾT
                </span>
              </div>
              <div className="text-xs text-slate-650 font-semibold leading-relaxed pl-1 whitespace-pre-line">
                {word.context || 'Từ vựng quan trọng trong bài học của bạn.'}
              </div>
            </div>

            {/* 3. VÍ DỤ MINH HỌA */}
            <div className="w-full bg-slate-50/40 border border-slate-100 rounded-2xl p-5 shadow-xs">
              <div className="border-b border-slate-200/60 pb-2 mb-3">
                <span className="text-xs font-black text-slate-500 tracking-wider flex items-center gap-1.5">
                  <span>✍️</span> VÍ DỤ MINH HỌA
                </span>
              </div>
              <div className="space-y-2 pl-1">
                {word.examples && word.examples.length > 0 ? (
                  <>
                    <div className="example-cn-bold text-lg font-black text-slate-850 leading-snug">{word.examples[0].chinese || word.examples[0].zhText}</div>
                    {showPinyin && (
                      <div className="example-py-italic text-xs font-semibold text-slate-500 italic">
                        [{word.examples[0].pinyin || getPinyin(word.examples[0].chinese || word.examples[0].zhText, { type: 'pinyin' })}]
                      </div>
                    )}
                    <div className="example-vn-small text-sm font-semibold text-slate-650 mt-1">{word.examples[0].vietnamese || word.examples[0].meaning || word.examples[0].viText}</div>
                  </>
                ) : word.exampleChinese ? (
                  <>
                    <div className="example-cn-bold text-lg font-black text-slate-850 leading-snug">{word.exampleChinese}</div>
                    {showPinyin && (
                      <div className="example-py-italic text-xs font-semibold text-slate-500 italic">
                        [{word.examplePinyin || getPinyin(word.exampleChinese, { type: 'pinyin' })}]
                      </div>
                    )}
                    <div className="example-vn-small text-sm font-semibold text-slate-650 mt-1">{word.exampleVietnamese}</div>
                  </>
                ) : (
                  <div className="text-slate-400 text-xs italic font-medium">Chưa có ví dụ cho từ này.</div>
                )}
              </div>
            </div>

            {/* 4. NGUỒN TÀI LIỆU */}
            <div className="w-full bg-slate-50/40 border border-slate-100 rounded-2xl p-5 shadow-xs">
              <div className="border-b border-slate-200/60 pb-2 mb-3">
                <span className="text-xs font-black text-slate-500 tracking-wider flex items-center gap-1.5">
                  <span>📚</span> NGUỒN TÀI LIỆU
                </span>
              </div>
              <div className="text-xs text-slate-600 font-bold italic pl-1 break-words space-y-1.5">
                {word.source ? (
                  word.source.split('\n').map((line, i) => (
                    <div key={i}>{line}</div>
                  ))
                ) : word.documentTitle ? (
                  <div>{word.documentTitle}</div>
                ) : (
                  <div>Dịch thuật / Sổ tay từ vựng</div>
                )}
              </div>
            </div>
            
          </div>

          <div className="back-footer mt-8 w-full flex justify-center pb-2 shrink-0">
            <span className="touch-indicator" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span>👆 Click hoặc nhấn</span>
              <kbd style={{ padding: '0.125rem 0.375rem', fontSize: '0.6875rem', fontFamily: 'monospace', color: '#64748b', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.375rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>Space</kbd>
              <span>để lật lại</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Flashcard;
