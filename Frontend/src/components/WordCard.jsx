import React, { useState, useEffect, useRef } from 'react';
import { translateSentence, compareSentences } from '../lib/api';
import { useVocabularyStore } from '../store/vocabularyStore';
import { toast } from '../store/notificationStore';
import { CHINESE_DICTIONARY } from '../utils/chineseUtils';
import { 
  Volume2, Bookmark, Award, HelpCircle,
  ArrowRight, BookOpen, Plus, Activity, RefreshCw, 
  Sparkles, CheckCircle2, ChevronRight, X
} from 'lucide-react';

const HSK_BADGES = {
  1: { label: 'HSK 1', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  2: { label: 'HSK 2', style: 'bg-teal-50 text-teal-700 border-teal-200' },
  3: { label: 'HSK 3', style: 'bg-sky-50 text-sky-700 border-sky-200' },
  4: { label: 'HSK 4', style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  5: { label: 'HSK 5', style: 'bg-orange-50 text-orange-700 border-orange-200' },
  6: { label: 'HSK 6', style: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const getHskLevel = (w) => {
  if (!w) return null;
  const cleanW = w.trim();
  if (CHINESE_DICTIONARY[cleanW] && CHINESE_DICTIONARY[cleanW].hsk) {
    return CHINESE_DICTIONARY[cleanW].hsk;
  }
  let maxHsk = 0;
  for (let i = 0; i < cleanW.length; i++) {
    const char = cleanW[i];
    if (CHINESE_DICTIONARY[char] && CHINESE_DICTIONARY[char].hsk) {
      maxHsk = Math.max(maxHsk, CHINESE_DICTIONARY[char].hsk);
    }
  }
  if (maxHsk > 0) return maxHsk;

  let hash = 0;
  for (let i = 0; i < cleanW.length; i++) {
    hash += cleanW.charCodeAt(i);
  }
  return (hash % 6) + 1;
};

const WordCard = ({ word, data, isLoading, onWordClick, documentId, documentTitle, documentText, pageNumber }) => {
  const addWord = useVocabularyStore(state => state.addWord);
  const updateServerStatus = useVocabularyStore(state => state.updateServerStatus);
  const fetchDecks = useVocabularyStore(state => state.fetchDecks);
  const bulkAddCards = useVocabularyStore(state => state.bulkAddCards);

  const [isSaving, setIsSaving] = useState(false);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [isAddingFlashcard, setIsAddingFlashcard] = useState(false);

  const handleOpenDeckModal = async () => {
    setShowDeckModal(true);
    try {
      const list = await fetchDecks();
      setDecks(list || []);
      if (list && list.length > 0) {
        setSelectedDeckId(String(list[0].id));
      } else {
        setSelectedDeckId('new');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // States for sentence translation
  const isSentence = word && (word.trim().length > 4 || /[,.!?，。！？]/g.test(word));
  const [sentenceData, setSentenceData] = useState(null);
  const [isLoadingSentence, setIsLoadingSentence] = useState(false);
  const [modifiedSentence, setModifiedSentence] = useState('');
  const [compareData, setCompareData] = useState(null);
  const [isLoadingCompare, setIsLoadingCompare] = useState(false);

  // Load sentence translation if active
  useEffect(() => {
    if (isSentence && word) {
      const fetchSentenceData = async () => {
        setIsLoadingSentence(true);
        setCompareData(null);
        setModifiedSentence(word);
        try {
          const res = await translateSentence(word);
          setSentenceData(res);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingSentence(false);
        }
      };
      fetchSentenceData();
    }
  }, [word, isSentence]);

  const playAudio = (textToPlay) => {
    const speechText = textToPlay || word;
    if (!speechText) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = 'zh-CN';
    window.speechSynthesis.speak(utterance);
  };

  const handleSaveToNotebook = async () => {
    if (!word) return;
    setIsSaving(true);
    try {
      await addWord({
        text: data.word,
        pinyin: data.pinyin,
        translation: typeof data.definitions === 'string' ? data.definitions : JSON.stringify(data.definitions),
        documentId: documentId,
        documentTitle: documentTitle,
        hanViet: data.hanViet,
        wordType: data.wordType,
        pageNumber: pageNumber
      });
      toast.success('Đã lưu vào sổ tay thành công!');
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi lưu vào sổ tay.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompare = async () => {
    if (!modifiedSentence || modifiedSentence.trim() === word.trim()) return;
    setIsLoadingCompare(true);
    try {
      const res = await compareSentences(word, modifiedSentence);
      setCompareData(res);
    } catch (e) {
      console.error(e);
      toast.error('Có lỗi xảy ra khi so sánh câu.');
    } finally {
      setIsLoadingCompare(false);
    }
  };

  // Map English wordType to Vietnamese label
  const WORD_TYPE_MAP = {
    'Verb': 'Động từ',
    'Noun': 'Danh từ',
    'Adjective': 'Tính từ',
    'Adverb': 'Trạng từ',
    'Pronoun': 'Đại từ',
    'Preposition': 'Giới từ',
    'Conjunction': 'Liên từ',
    'Particle': 'Trợ từ',
    'MeasureWord': 'Lượng từ',
    'Interjection': 'Thán từ',
    'Other': 'Khác',
  };

  const WORD_TYPE_STYLE = {
    'Verb':        'bg-blue-50 border-blue-200 text-blue-700',
    'Noun':        'bg-emerald-50 border-emerald-200 text-emerald-700',
    'Adjective':   'bg-amber-50 border-amber-200 text-amber-700',
    'Adverb':      'bg-purple-50 border-purple-200 text-purple-700',
    'Pronoun':     'bg-rose-50 border-rose-200 text-rose-700',
    'Preposition': 'bg-orange-50 border-orange-200 text-orange-700',
    'Conjunction': 'bg-teal-50 border-teal-200 text-teal-700',
    'Particle':    'bg-indigo-50 border-indigo-200 text-indigo-700',
    'MeasureWord': 'bg-cyan-50 border-cyan-200 text-cyan-700',
    'Interjection':'bg-pink-50 border-pink-200 text-pink-700',
    'Other':       'bg-gray-50 border-gray-200 text-gray-700',
  };

  // Loading state for words
  if (isLoading) {
    return (
      <div className="mt-4 animate-pulse space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-12 w-32 bg-gray-200 rounded-xl"></div>
          <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-6 w-24 bg-gray-200 rounded-lg"></div>
        <div className="h-24 bg-gray-200 rounded-2xl"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
        <p className="text-xs text-gray-400 italic text-center pt-4">AI đang tra từ điển & chuẩn bị ví dụ ngữ cảnh...</p>
      </div>
    );
  }

  // Loading state for sentences
  if (isSentence) {
    if (isLoadingSentence) {
      return (
        <div className="mt-4 animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded-xl w-3/4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-20 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
          <p className="text-xs text-gray-400 italic text-center">AI đang dịch câu & phân tích ngữ pháp liên quan...</p>
        </div>
      );
    }

    if (!sentenceData) {
      return (
        <div className="mt-8 text-center text-gray-500 bg-red-50 p-6 rounded-2xl border border-red-100">
          <HelpCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          Không thể phân dịch câu được chọn.
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-md mb-3">
            Dịch Câu AI
          </span>
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-900 leading-normal">{sentenceData.originalText}</h2>
            <button 
              onClick={() => playAudio(sentenceData.originalText)}
              className="p-2.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors shrink-0"
              title="Nghe câu gốc"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-blue-600 font-medium tracking-wide mt-1.5">{sentenceData.pinyin}</p>
          {sentenceData.hanViet && (
            <p className="text-xs text-gray-500 font-semibold mt-1">Hán Việt: <span className="text-gray-700 uppercase text-[11px] font-bold">{sentenceData.hanViet}</span></p>
          )}
        </div>

        {/* Translation Card */}
        <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
          <h3 className="text-[11px] font-black text-blue-800 uppercase tracking-widest mb-1.5">Bản Dịch Nghĩa</h3>
          <p className="text-base text-gray-800 font-bold leading-relaxed">{sentenceData.vietnamese}</p>
        </div>

        {/* Grammar Analysis */}
        {sentenceData.grammarAnalysis && (
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-150">
            <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-500" /> Giải Thích Ngữ Pháp AI
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line font-medium">
              {sentenceData.grammarAnalysis}
            </p>
          </div>
        )}

        {/* Interactive Grammar Learning Mode */}
        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500/10" />
            <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">Học Tương Tác AI</h4>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            Hãy chỉnh sửa câu trên để thực hành. AI sẽ dịch lại và so sánh chi tiết sự khác nhau.
          </p>
          
          <div className="space-y-3">
            <textarea
              value={modifiedSentence}
              onChange={(e) => setModifiedSentence(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-sans leading-relaxed resize-none"
              rows={2}
              placeholder="Chỉnh sửa câu tiếng Trung tại đây..."
            />
            
            <button
              onClick={handleCompare}
              disabled={isLoadingCompare || !modifiedSentence || modifiedSentence.trim() === word.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all select-none shadow-sm active:scale-95"
            >
              {isLoadingCompare ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              So sánh & Phân tích
            </button>
          </div>

          {/* Comparison Results */}
          {compareData && (
            <div className="mt-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-100 animate-in space-y-3">
              <div className="text-xs font-black text-amber-800 uppercase tracking-wider">KẾT QUẢ SO SÁNH:</div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-gray-500">Câu gốc: </span>
                  <span className="text-gray-700 italic">"{compareData.originalTranslation}"</span>
                </div>
                <div>
                  <span className="font-bold text-gray-500">Câu mới: </span>
                  <span className="text-blue-700 font-bold">"{compareData.modifiedTranslation}"</span>
                </div>
                <div className="border-t border-amber-100 pt-2 text-gray-600 leading-relaxed font-medium">
                  <span className="font-black text-amber-800 block mb-1">Khác biệt ngữ nghĩa & cấu trúc:</span>
                  {compareData.differences}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Word card display
  if (!data) {
    return (
      <div className="mt-12 text-center text-gray-500">
        Không tìm thấy thông tin chi tiết cho '{word}'
      </div>
    );
  }

  const cleanDefinition = () => {
    try {
      const parsed = JSON.parse(data.definitions);
      if (typeof parsed === 'string') return parsed;
      
      if (Array.isArray(parsed)) {
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
  };

  // Parse wordType — may contain multiple types separated by '/' or ','
  const parseWordTypes = () => {
    if (!data?.wordType) return [];
    return data.wordType
      .split(/[/,、]/) 
      .map(t => t.trim())
      .filter(Boolean);
  };
  const wordTypes = parseWordTypes();


  const hskLevel = getHskLevel(data.word);
  const badgeConfig = HSK_BADGES[hskLevel] || { label: 'HSK Level', style: 'bg-gray-50 text-gray-600 border-gray-200' };

  return (
    <div className="mt-4 space-y-6">
      {/* Header: Word & Audio */}
      <div className="border-b border-gray-100 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-extrabold text-gray-900 font-display">{data.word}</h2>
            <span className={`px-2.5 py-0.5 border text-[10px] font-black uppercase tracking-wider rounded-md ${badgeConfig.style}`}>
              {badgeConfig.label}
            </span>
          </div>
          <button 
            onClick={() => playAudio(data.word)}
            className="p-2.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors shrink-0"
            title="Nghe phát âm"
          >
            <Volume2 className="w-5.5 h-5.5" />
          </button>
        </div>
        
        {/* Pinyin, Part of Speech, Hán Việt */}
        <div className="flex items-center flex-wrap gap-2.5 mt-3">
          <span className="text-lg text-blue-600 font-extrabold tracking-wide">{data.pinyin}</span>
          {wordTypes.map((wt, i) => (
            <span
              key={i}
              className={`px-2.5 py-0.5 border text-[10px] font-black uppercase tracking-wider rounded-md ${WORD_TYPE_STYLE[wt] || 'bg-gray-100 border-gray-200 text-gray-700'}`}
            >
              {WORD_TYPE_MAP[wt] || wt}
            </span>
          ))}
          {wordTypes.length === 0 && (
            <span className="px-2.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-wider rounded-md">
              Từ loại khác
            </span>
          )}
          {data.hanViet && (
            <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-md">
              Hán Việt: {data.hanViet}
            </span>
          )}
        </div>
      </div>

      {/* Definitions — split by word type */}
      <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 space-y-3">
        <h3 className="text-[11px] font-black text-blue-800 uppercase tracking-widest mb-1.5">Định Nghĩa Tiếng Việt</h3>
        {wordTypes.length > 1 ? (
          wordTypes.map((wt, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`shrink-0 px-2 py-0.5 border text-[9px] font-black uppercase tracking-wide rounded-md mt-0.5 ${WORD_TYPE_STYLE[wt] || 'bg-gray-100 border-gray-200 text-gray-700'}`}>
                {WORD_TYPE_MAP[wt] || wt}
              </span>
              <p className="text-sm text-gray-800 font-bold leading-relaxed">{cleanDefinition()}</p>
            </div>
          ))
        ) : wordTypes.length === 1 ? (
          <div className="flex items-start gap-2">
            <span className={`shrink-0 px-2 py-0.5 border text-[9px] font-black uppercase tracking-wide rounded-md mt-0.5 ${WORD_TYPE_STYLE[wordTypes[0]] || 'bg-gray-100 border-gray-200 text-gray-700'}`}>
              {WORD_TYPE_MAP[wordTypes[0]] || wordTypes[0]}
            </span>
            <p className="text-base text-gray-800 font-bold leading-relaxed">{cleanDefinition()}</p>
          </div>
        ) : (
          <p className="text-base text-gray-800 font-bold leading-relaxed">{cleanDefinition()}</p>
        )}
      </div>

      {/* Usage Notes → Ngữ Cảnh */}
      {data.usageNotes && (
        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-150">
          <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-widest mb-1.5">Ngữ Cảnh</h3>
          <p className="text-xs text-gray-600 font-medium leading-relaxed whitespace-pre-line">{data.usageNotes}</p>
        </div>
      )}

      {/* Collocations & Grammar Patterns */}
      {((data.collocations && data.collocations.length > 0) || (data.grammarPatterns && data.grammarPatterns.length > 0)) && (
        <div className="space-y-4">
          {data.collocations && data.collocations.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-2">Từ thường đi cùng (Collocations)</h3>
              <div className="flex flex-wrap gap-2">
                {data.collocations.map((col, idx) => (
                  <span 
                    key={idx} 
                    onClick={() => playAudio(col)}
                    className="px-2.5 py-1.5 bg-blue-50/40 text-blue-800 hover:bg-blue-50 rounded-xl text-xs font-semibold border border-blue-100/50 cursor-pointer flex items-center gap-1 transition-all"
                  >
                    {col}
                    <Volume2 className="w-3.5 h-3.5 opacity-40" />
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.grammarPatterns && data.grammarPatterns.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-2">Cấu trúc ngữ pháp liên quan</h3>
              <ul className="space-y-1.5">
                {data.grammarPatterns.map((pat, idx) => (
                  <li key={idx} className="flex items-center gap-2 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 text-xs font-bold text-gray-700">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
                    <span>{pat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Ví dụ câu mẫu (AI-generated) */}
      {data.examples && data.examples.length > 0 && (
        <div>
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider border-b pb-2 mb-3">Ví dụ câu mẫu</h3>
          <div className="space-y-3.5">
            {data.examples.map((ex, idx) => (
              <div key={idx} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex justify-between items-start gap-4 hover:border-blue-200 transition-colors">
                <div className="space-y-1 flex-1">
                  <p className="text-base text-gray-800 font-bold">{ex.zhText}</p>
                  {ex.pinyin && <p className="text-xs text-gray-500 leading-none">{ex.pinyin}</p>}
                  {ex.viText && <p className="text-sm text-blue-700 font-medium pt-1">{ex.viText}</p>}
                </div>
                <button 
                  onClick={() => playAudio(ex.zhText)}
                  className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-full transition-all shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Words */}
      {(data.synonyms?.length > 0 || data.antonyms?.length > 0 || data.compounds?.length > 0) && (
        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-150 space-y-4">
          <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest border-b border-gray-200 pb-2">Từ liên quan</h3>
          
          {data.synonyms?.length > 0 && (
            <div>
              <h4 className="text-[10px] text-gray-405 font-black uppercase tracking-wider mb-2">Từ đồng nghĩa</h4>
              <div className="flex flex-wrap gap-2">
                {data.synonyms.map((syn, idx) => (
                  <span 
                    key={idx} 
                    onClick={() => onWordClick && onWordClick(syn)}
                    className="px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold border border-green-200 cursor-pointer transition-colors"
                  >
                    {syn}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.antonyms?.length > 0 && (
            <div>
              <h4 className="text-[10px] text-gray-450 font-black uppercase tracking-wider mb-2">Từ trái nghĩa</h4>
              <div className="flex flex-wrap gap-2">
                {data.antonyms.map((ant, idx) => (
                  <span 
                    key={idx} 
                    onClick={() => onWordClick && onWordClick(ant)}
                    className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold border border-red-200 cursor-pointer transition-colors"
                  >
                    {ant}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.compounds?.length > 0 && (
            <div>
              <h4 className="text-[10px] text-gray-450 font-black uppercase tracking-wider mb-2">Từ ghép</h4>
              <div className="flex flex-wrap gap-2">
                {data.compounds.map((comp, idx) => (
                  <span 
                    key={idx} 
                    onClick={() => onWordClick && onWordClick(comp)}
                    className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold border border-purple-200 cursor-pointer transition-colors"
                  >
                    {comp}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
        <button 
          onClick={handleSaveToNotebook}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-xl transition-all shadow-sm text-xs uppercase tracking-wider active:scale-95 disabled:opacity-50"
        >
          <Bookmark className="w-4 h-4 text-blue-500" />
          {isSaving ? 'Đang lưu...' : 'Lưu Sổ Tay'}
        </button>
        <button 
          onClick={handleOpenDeckModal}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md text-xs uppercase tracking-wider active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Flashcard</span>
        </button>
      </div>

      {showDeckModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div 
            onClick={() => setShowDeckModal(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <div className="relative bg-white/95 border border-slate-200/60 backdrop-blur-md max-w-sm w-full rounded-2xl p-6 shadow-2xl z-10 flex flex-col gap-4 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Thêm vào bộ Flashcard</h3>
              <button 
                onClick={() => setShowDeckModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-left">
              <div>
                <span className="font-bold text-slate-500 block mb-1">Từ vựng:</span>
                <span className="font-extrabold text-slate-850 text-base">{data.word}</span>
              </div>

              <div>
                <span className="font-bold text-slate-500 block mb-1">Nguồn tài liệu:</span>
                <span className="font-semibold text-slate-700 bg-slate-50 border border-slate-150 px-2.5 py-1.5 rounded-lg block">
                  {documentTitle ? `Dịch thuật ${documentTitle}` : 'Tra cứu ngoài'}
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-500 block mb-1">Chọn bộ Flashcard:</span>
                <select
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {decks.map(deck => (
                    <option key={deck.id} value={deck.id}>{deck.name}</option>
                  ))}
                  <option value="new">+ Tạo bộ mới...</option>
                </select>
              </div>

              {selectedDeckId === 'new' && (
                <div className="space-y-1.5 animate-in fade-in duration-100">
                  <span className="font-bold text-slate-500 block">Tên bộ Flashcard mới:</span>
                  <input
                    type="text"
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    placeholder="VD: HSK4 Reading Lesson 19"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowDeckModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-655 text-xs font-bold rounded-xl transition active:scale-97"
              >
                Hủy
              </button>
              <button
                disabled={isAddingFlashcard || (selectedDeckId === 'new' && !newDeckName.trim())}
                onClick={async () => {
                  setIsAddingFlashcard(true);
                  try {
                    const payload = {
                      deckId: selectedDeckId === 'new' ? null : Number(selectedDeckId),
                      newDeckName: selectedDeckId === 'new' ? newDeckName.trim() : null,
                      source: documentTitle ? `Dịch thuật ${documentTitle}` : 'Tra cứu ngoài',
                      documentId: documentId || null,
                      words: [data.word]
                    };
                    await bulkAddCards(payload);
                    setShowDeckModal(false);
                    toast.success("Đã thêm từ vào bộ Flashcard thành công!");
                  } catch (e) {
                    toast.error(e.message || "Lỗi khi lưu Flashcard.");
                  } finally {
                    setIsAddingFlashcard(false);
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition active:scale-97 shadow-md disabled:opacity-50"
              >
                {isAddingFlashcard ? 'Đang tạo...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default WordCard;
