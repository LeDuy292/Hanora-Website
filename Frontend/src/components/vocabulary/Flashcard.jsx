import { useState } from 'react';
import { Volume2, Star, Sparkles } from 'lucide-react';

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

  return (
    <div className="flashcard-main">
      <div className={`flashcard-inner ${isFlipped ? 'is-flipped' : ''}`} onClick={onFlip}>
        
        {/* FRONT FACE */}
        <div className="flashcard-face flashcard-front">
          <div className="card-header">
            <div className="card-header-left">
              <span className="hsk-badge">HSK {word.hsk || 4}</span>
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
        <div className="flashcard-face flashcard-back">
          <div className="back-header">
            <div className="back-title-group">
              <h2 className="back-character">{word.text}</h2>
              {showPinyin && <span className="back-pinyin">[{word.pinyin}]</span>}
            </div>
            <button className="audio-btn-circle" onClick={speakWord}>
              <Volume2 className="w-5 h-5" />
            </button>
            <div className="back-card-meta">
              <span className="hsk-badge-small">HSK {word.hsk || 1}</span>
              <button className="favorite-btn-minimal" onClick={handleFavoriteClick}>
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
              </button>
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-label-subtle">NGHĨA ({word.wordType || word.type || 'Từ vựng'})</div>
            <div className="meaning-box">
              {word.translation || word.meaning}
              {word.fullDefinitions?.length > 1 && (
                <div className="additional-meanings">
                  {word.fullDefinitions.slice(1).map((d, i) => (
                    <div key={i} className="sub-meaning">• {d.meaning}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-label-subtle">VÍ DỤ</div>
            <div className="example-content">
              {word.examples && word.examples.length > 0 ? (
                <>
                  <div className="example-cn-bold">{word.examples[0].chinese || word.examples[0].zhText}</div>
                  {showPinyin && <div className="example-py-italic">{word.examples[0].pinyin}</div>}
                  <div className="example-vn-small">{word.examples[0].vietnamese || word.examples[0].meaning || word.examples[0].viText}</div>
                </>
              ) : word.exampleChinese ? (
                <>
                  <div className="example-cn-bold">{word.exampleChinese}</div>
                  {showPinyin && <div className="example-py-italic">{word.examplePinyin}</div>}
                  <div className="example-vn-small">{word.exampleVietnamese}</div>
                </>
              ) : (
                <div className="text-slate-400 text-sm italic">Chưa có ví dụ cho từ này.</div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-label-subtle">GIẢI THÍCH</div>
            <div className="context-box">
              <p>{word.context || 'Từ vựng quan trọng trong bài học của bạn.'}</p>
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-label-subtle">NGUỒN TÀI LIỆU</div>
            <div className="context-box text-xs text-slate-500 font-semibold italic">
              {word.source || 'Dịch thuật / Sổ tay từ vựng'}
            </div>
          </div>

          {(word.collocations || word.grammarPatterns) && (
            <div className="detail-section">
              <div className="detail-label-subtle flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                <span>GỢI Ý CỦA AI</span>
              </div>
              <div className="bg-blue-50/30 border border-blue-100 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
                {word.collocations && (
                  <div>
                    <strong className="text-slate-700">Cụm từ thường gặp:</strong>
                    <p className="mt-0.5">{word.collocations}</p>
                  </div>
                )}
                {word.grammarPatterns && (
                  <div>
                    <strong className="text-slate-700">Mẫu ngữ pháp:</strong>
                    <p className="mt-0.5">{word.grammarPatterns}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="back-footer">
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
