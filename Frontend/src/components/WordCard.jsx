import React from 'react';

const WordCard = ({ word, data, isLoading, onWordClick }) => {
  const playAudio = () => {
    if (!word) return;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'zh-CN';
    window.speechSynthesis.speak(utterance);
  };

  if (isLoading) {
    return (
      <div className="mt-8 animate-pulse space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-20 bg-gray-200 rounded-lg"></div>
          <div className="h-8 w-24 bg-gray-200 rounded"></div>
        </div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
        <div className="h-20 bg-gray-200 rounded-xl"></div>
        <div className="space-y-4 mt-6">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
        <p className="text-sm text-gray-400 italic mt-4 text-center">Đang tra cứu từ điển / AI tạo dữ liệu...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mt-12 text-center text-gray-500">
        Không tìm thấy thông tin cho từ '{word}'
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* Header: Word & Audio */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-5xl font-bold text-gray-900">{data.word}</h2>
        <button 
          onClick={playAudio}
          className="p-3 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
          title="Nghe phát âm"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        </button>
      </div>

      {/* Pinyin & Type */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xl text-blue-600 font-medium tracking-wide">{data.pinyin}</span>
        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-md uppercase tracking-wider">
          {data.wordType}
        </span>
      </div>

      {/* Definition */}
      <div className="bg-blue-50/50 rounded-xl p-5 mb-8 border border-blue-100">
        <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-2">Định nghĩa</h3>
        <p className="text-lg text-gray-800 leading-relaxed">
          {(() => {
            try {
              const parsed = JSON.parse(data.definitions);
              if (typeof parsed === 'string') return parsed;
              
              if (Array.isArray(parsed)) {
                // Find Vietnamese first, otherwise take the first
                const vnDef = parsed.find(d => d.lang === 'vn' || d.lang === 'vi');
                if (vnDef && vnDef.meaning) return vnDef.meaning;
                if (parsed.length > 0 && parsed[0].meaning) return parsed[0].meaning;
                return JSON.stringify(parsed);
              }
              
              if (parsed && typeof parsed === 'object') {
                if (parsed.meaning) return parsed.meaning;
                return JSON.stringify(parsed);
              }
              return String(parsed);
            } catch (e) {
              return data.definitions;
            }
          })()}
        </p>
      </div>

      {/* Examples */}
      {data.examples && data.examples.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Ví dụ câu</h3>
          <div className="space-y-5">
            {data.examples.map((ex, idx) => (
              <div key={idx} className="group p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-blue-200 transition-colors">
                <p className="text-lg text-gray-800 font-medium mb-1">{ex.zhText}</p>
                {ex.pinyin && <p className="text-sm text-gray-500 mb-2">{ex.pinyin}</p>}
                {ex.viText ? (
                  <p className="text-base text-blue-700 font-medium">{ex.viText}</p>
                ) : ex.enText ? (
                  <p className="text-base text-gray-500 italic">{ex.enText} <span className="text-xs text-gray-400 ml-2">(Đang dịch...)</span></p>
                ) : (
                  <p className="text-base text-gray-400 italic">Đang tải bản dịch...</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Words */}
      {(data.synonyms?.length > 0 || data.antonyms?.length > 0 || data.compounds?.length > 0) && (
        <div className="mb-8 bg-gray-50 rounded-xl p-5 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Từ liên quan</h3>
          
          {data.synonyms?.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs text-gray-500 uppercase mb-2">Đồng nghĩa</h4>
              <div className="flex flex-wrap gap-2">
                {data.synonyms.map((syn, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => onWordClick && onWordClick(syn)}
                    className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-sm font-medium transition-colors border border-green-200 cursor-pointer"
                  >
                    {syn}
                  </button>
                ))}
              </div>
            </div>
          )}

          {data.antonyms?.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs text-gray-500 uppercase mb-2">Trái nghĩa</h4>
              <div className="flex flex-wrap gap-2">
                {data.antonyms.map((ant, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => onWordClick && onWordClick(ant)}
                    className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-sm font-medium transition-colors border border-red-200 cursor-pointer"
                  >
                    {ant}
                  </button>
                ))}
              </div>
            </div>
          )}

          {data.compounds?.length > 0 && (
            <div>
              <h4 className="text-xs text-gray-500 uppercase mb-2">Từ ghép</h4>
              <div className="flex flex-wrap gap-2">
                {data.compounds.map((comp, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => onWordClick && onWordClick(comp)}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-md text-sm font-medium transition-colors border border-purple-200 cursor-pointer"
                  >
                    {comp}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-10 pt-6 border-t border-gray-100 flex gap-3">
        <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm">
          Lưu Sổ Tay
        </button>
        <button className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
          Báo cáo
        </button>
      </div>
    </div>
  );
};

export default WordCard;
