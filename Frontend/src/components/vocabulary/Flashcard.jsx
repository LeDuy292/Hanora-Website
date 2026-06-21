import { useState } from 'react';
import { Volume2, Star, BookOpen, PenTool, Info, Brain, History, Lightbulb } from 'lucide-react';

export function Flashcard({ 
  word, 
  isFlipped, 
  onFlip, 
  onFavorite,
  isFavorite 
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
              <span className="pos-badge">{word.wordType || 'Từ vựng'}</span>
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
            <p className="main-pinyin">{word.pinyin}</p>
            <button className="audio-btn" onClick={speakWord}>
              <Volume2 className="w-5 h-5" />
              Nghe phát âm
            </button>
          </div>
        </div>

        {/* BACK FACE */}
        <div className="flashcard-face flashcard-back">
          <div className="back-header">
            <div className="back-title-group">
              <h2 className="back-character">{word.text}</h2>
              <span className="back-pinyin">[{word.pinyin}]</span>
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
            <div className="detail-label-subtle">NGHĨA</div>
            <div className="meaning-box">
              {word.translation}
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
                  <div className="example-cn-bold">{word.examples[0].chinese}</div>
                  <div className="example-py-italic">{word.examples[0].pinyin}</div>
                  <div className="example-vn-small">{word.examples[0].vietnamese || word.examples[0].meaning}</div>
                </>
              ) : (
                <div className="text-slate-400 text-sm italic">Chưa có ví dụ cho từ này.</div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-label-subtle">GHI CHÚ</div>
            <div className="context-box">
              <Lightbulb className="w-4 h-4 text-blue-400 shrink-0" />
              <p>
                {word.wordType === 'Động từ' 
                  ? 'Thường đứng sau chủ ngữ để biểu thị hành động.' 
                  : (word.wordType === 'Danh từ' ? 'Thường làm tân ngữ hoặc chủ ngữ trong câu.' : 'Từ vựng quan trọng trong bài học.')}
              </p>
            </div>
          </div>

          <div className="back-footer">
            <span className="touch-indicator">👆 Nhấp vào thẻ để quay lại</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Flashcard;
