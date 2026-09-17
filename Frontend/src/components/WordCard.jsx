import React, { useState, useEffect, useRef } from 'react';
import { translateSentence, compareSentences, reportTranslationError } from '../lib/api';
import { useToastStore } from '../store/toastStore';
import { useVocabularyStore } from '../store/vocabularyStore';
import { useLanguageStore } from '../store/languageStore';
import { toast } from '../store/notificationStore';
import { CHINESE_DICTIONARY, CHARACTER_DATABASE, extractPlainMeaning, cleanPinyin } from '../utils/chineseUtils';
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
  const { t, language } = useLanguageStore();
  const addWord = useVocabularyStore(state => state.addWord);
  const updateServerStatus = useVocabularyStore(state => state.updateServerStatus);
  const fetchDecks = useVocabularyStore(state => state.fetchDecks);
  const bulkAddCards = useVocabularyStore(state => state.bulkAddCards);
  const isWordSaved = useVocabularyStore(state => state.isWordSaved);
  const fetchUserVocabulary = useVocabularyStore(state => state.fetchUserVocabulary);

  const [isSaving, setIsSaving] = useState(false);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [isAddingFlashcard, setIsAddingFlashcard] = useState(false);
  const [showCardMenu, setShowCardMenu] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackProposed, setFeedbackProposed] = useState('');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

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
          const res = await translateSentence(word, language);
          setSentenceData(res);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingSentence(false);
        }
      };
      fetchSentenceData();
    }
  }, [word, isSentence, language]);

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
      const result = await addWord({
        text: data.word,
        pinyin: data.pinyin,
        translation: typeof data.definitions === 'string' ? data.definitions : JSON.stringify(data.definitions),
        documentId: documentId,
        documentTitle: documentTitle,
        hanViet: data.hanViet,
        wordType: data.wordType,
        pageNumber: pageNumber
      });
      useToastStore.getState().addToast(
        result?.message || (language === 'en' ? 'Saved to notebook successfully.' : 'Đã lưu vào sổ tay thành công.'),
        result?.alreadyExists ? 'warning' : 'success'
      );
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast(language === 'en' ? 'Error saving to notebook.' : 'Có lỗi xảy ra khi lưu vào sổ tay.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompare = async () => {
    if (!modifiedSentence || modifiedSentence.trim() === word.trim()) return;
    setIsLoadingCompare(true);
    try {
      const res = await compareSentences(word, modifiedSentence, language);
      setCompareData(res);
    } catch (e) {
      console.error(e);
      useToastStore.getState().addToast(language === 'en' ? 'Error comparing sentences.' : 'Có lỗi xảy ra khi so sánh câu.', 'error');
    } finally {
      setIsLoadingCompare(false);
    }
  };

  // Map English wordType to localized label
  const WORD_TYPE_MAP = {
    'Verb': t('wordTypes.Verb'),
    'Noun': t('wordTypes.Noun'),
    'Adjective': t('wordTypes.Adjective'),
    'Adverb': t('wordTypes.Adverb'),
    'Pronoun': t('wordTypes.Pronoun'),
    'Preposition': t('wordTypes.Preposition'),
    'Conjunction': t('wordTypes.Conjunction'),
    'Particle': t('wordTypes.Particle'),
    'MeasureWord': t('wordTypes.MeasureWord'),
    'Interjection': t('wordTypes.Interjection'),
    'Other': t('wordTypes.Other'),
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
        <p className="text-xs text-gray-400 italic text-center pt-4">{t('reader.wordCard.aiLoading')}</p>
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
          <p className="text-xs text-gray-400 italic text-center">{t('reader.sentence.aiLoading')}</p>
        </div>
      );
    }

    if (!sentenceData) {
      return (
        <div className="mt-8 text-center text-gray-500 bg-red-50 p-6 rounded-2xl border border-red-100">
          <HelpCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          {t('reader.sentence.failed')}
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-md mb-3">
            {t('reader.sentence.aiBadge')}
          </span>
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-900 leading-normal">{sentenceData.originalText}</h2>
            <button 
              onClick={() => playAudio(sentenceData.originalText)}
              className="p-2.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors shrink-0"
              title={t('common.listenAudio')}
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-blue-600 font-medium tracking-wide mt-1.5">{sentenceData.pinyin}</p>
          {sentenceData.hanViet && (
            <p className="text-xs text-gray-500 font-semibold mt-1">{t('reader.wordCard.sinoVietnamese')}: <span className="text-gray-700 uppercase text-[11px] font-bold">{sentenceData.hanViet}</span></p>
          )}
        </div>

        {/* Translation Card */}
        <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
          <h3 className="text-[11px] font-black text-blue-800 uppercase tracking-widest mb-1.5">{t('reader.sentence.translationTitle')}</h3>
          <p className="text-base text-gray-800 font-bold leading-relaxed">{sentenceData.translation || sentenceData.translatedText || sentenceData.vietnamese || sentenceData.Vietnamese}</p>
        </div>

        {/* Grammar Analysis */}
        {sentenceData.grammarAnalysis && (
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-150">
            <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-500" /> {t('reader.sentence.grammarTitle')}
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
            <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">{t('reader.sentence.interactiveTitle')}</h4>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            {t('reader.sentence.interactiveDesc')}
          </p>
          
          <div className="space-y-3">
            <textarea
              value={modifiedSentence}
              onChange={(e) => setModifiedSentence(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-sans leading-relaxed resize-none"
              rows={2}
              placeholder={t('reader.sentence.inputPlaceholder')}
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
              {isLoadingCompare ? t('reader.sentence.comparing') : t('reader.sentence.compareBtn')}
            </button>
          </div>

          {/* Comparison Results */}
          {compareData && (
            <div className="mt-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-100 animate-in space-y-3">
              <div className="text-xs font-black text-amber-800 uppercase tracking-wider">{t('reader.sentence.comparisonResults')}</div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-gray-500">{t('reader.sentence.originalText')} </span>
                  <span className="text-gray-700 italic">"{compareData.originalTranslation}"</span>
                </div>
                <div>
                  <span className="font-bold text-gray-500">{t('reader.sentence.modifiedText')} </span>
                  <span className="text-blue-700 font-bold">"{compareData.modifiedTranslation}"</span>
                </div>
                <div className="border-t border-amber-100 pt-2 text-gray-600 leading-relaxed font-medium">
                  <span className="font-black text-amber-800 block mb-1">{t('reader.sentence.differences')}</span>
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
        {t('reader.wordCard.notFound')}
      </div>
    );
  }

  const cleanDefinition = () => {
    if (language === 'en') {
      if (data.definitionEn) return data.definitionEn;
      if (data.definition && !/[\u00C0-\u024F\u1EA0-\u1EF9]/.test(data.definition)) return data.definition;
      if (CHINESE_DICTIONARY[data.word]?.translation) return CHINESE_DICTIONARY[data.word].translation;
      if (CHARACTER_DATABASE[data.word]?.translation) return CHARACTER_DATABASE[data.word].translation;
    }
    const raw = data.definitions || data.translation || data.meaning || data.definition;
    const extracted = extractPlainMeaning(raw, language, data.word);
    if (language === 'en') {
      if (data.definitionEn) return data.definitionEn;
      if (CHINESE_DICTIONARY[data.word]?.translation) return CHINESE_DICTIONARY[data.word].translation;
      if (CHARACTER_DATABASE[data.word]?.translation) return CHARACTER_DATABASE[data.word].translation;
    }
    return extracted;
  };

  const handleSendFeedback = async () => {
    if (!feedbackProposed.trim()) return;
    setIsSubmittingFeedback(true);
    try {
      await reportTranslationError(
        data.word || word,
        cleanDefinition(),
        feedbackProposed.trim(),
        feedbackNotes.trim()
      );
      toast.success(language === 'en' ? "Thank you for your feedback! The team will review it." : "Cảm ơn bạn đã góp ý! Ban quản trị sẽ kiểm duyệt phản hồi này.");
      setShowFeedbackForm(false);
      setFeedbackProposed('');
      setFeedbackNotes('');
    } catch (error) {
      console.error(error);
      toast.error(error.message || (language === 'en' ? "Failed to send feedback. Please try again later." : "Không thể gửi góp ý. Vui lòng thử lại sau."));
    } finally {
      setIsSubmittingFeedback(false);
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

  const isAlreadySavedInStore = isWordSaved(data.word || word);

  return (
    <div className="mt-4 space-y-6">
      {/* Action Buttons */}
      <div className="pb-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
        <button 
          id="save-word"
          data-tour="save-word-btn"
          onClick={handleSaveToNotebook}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm text-xs uppercase tracking-wider active:scale-95 disabled:opacity-50"
        >
          <Bookmark className="w-4 h-4 text-blue-500" />
          {isSaving ? t('reader.wordCard.saving') : t('reader.wordCard.saveNotebook')}
        </button>
        <button 
          onClick={handleOpenDeckModal}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-md text-xs uppercase tracking-wider active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t('reader.wordCard.addFlashcard')}</span>
        </button>
      </div>

      {/* Saved Notification Banner */}
      {isAlreadySavedInStore && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-amber-800 flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t('reader.wordCard.savedBanner')}</span>
        </div>
      )}

      {/* Header: Word & Audio */}
      <div className="border-b border-gray-100 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-extrabold text-gray-900 font-display">{data.word}</h2>
            <span className={`px-2.5 py-0.5 border text-[10px] font-black uppercase tracking-wider rounded-md ${badgeConfig.style}`}>
              {badgeConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-2 relative">
            <button 
              onClick={() => playAudio(data.word)}
              className="p-2.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors shrink-0"
              title={t('common.listenAudio')}
            >
              <Volume2 className="w-5.5 h-5.5" />
            </button>

            {/* 3-dots Menu Button */}
            <button
              onClick={() => setShowCardMenu(!showCardMenu)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              title={t('reader.wordCard.otherOptions')}
            >
              <ChevronRight className="w-5 h-5 rotate-90" />
            </button>

            {showCardMenu && (
              <div className="absolute right-0 top-10 z-50 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setShowCardMenu(false);
                    useToastStore.getState().addToast(`${t('reader.wordCard.originalDoc')}: ${data.word}`, 'info');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span>{t('reader.wordCard.originalDoc')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Pinyin, Part of Speech, Hán Việt */}
        <div className="flex items-center flex-wrap gap-2.5 mt-3">
          <span className="text-lg text-blue-600 font-extrabold tracking-wide">{cleanPinyin(data.word || word, data.pinyin)}</span>
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
              {t('wordTypes.Other')}
            </span>
          )}
          {data.hanViet && (
            <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-md">
              {t('reader.wordCard.sinoVietnamese')}: {data.hanViet}
            </span>
          )}
        </div>
      </div>

      {/* Definitions — split by word type */}
      <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 space-y-3">
        <div className="flex items-center justify-between border-b border-blue-100/50 pb-2 mb-1.5">
          <h3 className="text-[11px] font-black text-blue-800 uppercase tracking-widest">{t('reader.wordCard.definitionTitle')}</h3>
          <button
            onClick={() => setShowFeedbackForm(!showFeedbackForm)}
            className="text-[10px] font-bold text-blue-650 hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{t('reader.wordCard.reportError')}</span>
          </button>
        </div>

        {showFeedbackForm && (
          <div className="p-3.5 bg-white rounded-xl border border-blue-100 shadow-sm space-y-3 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
            <p className="font-bold text-slate-700">{t('reader.wordCard.feedbackTitle', { word: data.word || word })}</p>
            <div className="space-y-2">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">{t('reader.wordCard.proposedMeaning')}</label>
                <input
                  type="text"
                  placeholder={t('reader.wordCard.proposedPlaceholder')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={feedbackProposed}
                  onChange={(e) => setFeedbackProposed(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">{t('reader.wordCard.feedbackNotes')}</label>
                <textarea
                  placeholder={t('reader.wordCard.notesPlaceholder')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-16 resize-none"
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowFeedbackForm(false);
                  setFeedbackProposed('');
                  setFeedbackNotes('');
                }}
                className="px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-500 font-bold transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSendFeedback}
                disabled={!feedbackProposed.trim() || isSubmittingFeedback}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isSubmittingFeedback ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>{t('reader.wordCard.sending')}</span>
                  </>
                ) : (
                  <span>{t('reader.wordCard.sendFeedback')}</span>
                )}
              </button>
            </div>
          </div>
        )}

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
          <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-widest mb-1.5">{t('reader.wordCard.usageNotes')}</h3>
          <p className="text-xs text-gray-600 font-medium leading-relaxed whitespace-pre-line">{data.usageNotes}</p>
        </div>
      )}

      {/* Collocations & Grammar Patterns */}
      {((data.collocations && data.collocations.length > 0) || (data.grammarPatterns && data.grammarPatterns.length > 0)) && (
        <div className="space-y-4">
          {data.collocations && data.collocations.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-2">{t('reader.wordCard.collocations')}</h3>
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
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-2">{t('reader.wordCard.grammarPatterns')}</h3>
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

      {/* Example Sentences */}
      {data.examples && data.examples.length > 0 && (
        <div>
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider border-b pb-2 mb-3">{t('reader.wordCard.examples')}</h3>
          <div className="space-y-3.5">
            {data.examples.map((ex, idx) => (
              <div key={idx} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex justify-between items-start gap-4 hover:border-blue-200 transition-colors">
                <div className="space-y-1 flex-1">
                  <p className="text-base text-gray-800 font-bold">{ex.zhText}</p>
                  {ex.pinyin && <p className="text-xs text-gray-500 leading-none">{ex.pinyin}</p>}
                  <p className="text-sm text-blue-700 font-medium pt-1">
                    {language === 'en' ? (ex.enText || ex.english || ex.viText) : (ex.viText || ex.vietnamese || ex.enText)}
                  </p>
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
          <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest border-b border-gray-200 pb-2">{t('reader.wordCard.relatedWords')}</h3>
          
          {data.synonyms?.length > 0 && (
            <div>
              <h4 className="text-[10px] text-gray-405 font-black uppercase tracking-wider mb-2">{t('reader.wordCard.synonyms')}</h4>
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
              <h4 className="text-[10px] text-gray-450 font-black uppercase tracking-wider mb-2">{t('reader.wordCard.antonyms')}</h4>
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
              <h4 className="text-[10px] text-gray-450 font-black uppercase tracking-wider mb-2">{t('reader.wordCard.compounds')}</h4>
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

      {showDeckModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div 
            onClick={() => setShowDeckModal(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <div className="relative bg-white/95 border border-slate-200/60 backdrop-blur-md max-w-sm w-full rounded-2xl p-6 shadow-2xl z-10 flex flex-col gap-4 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">{language === 'en' ? 'Add to Flashcard Deck' : 'Thêm vào bộ Flashcard'}</h3>
              <button 
                onClick={() => setShowDeckModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-left">
              <div>
                <span className="font-bold text-slate-500 block mb-1">{language === 'en' ? 'Vocabulary:' : 'Từ vựng:'}</span>
                <span className="font-extrabold text-slate-850 text-base">{data.word}</span>
              </div>

              <div>
                <span className="font-bold text-slate-500 block mb-1">{language === 'en' ? 'Source document:' : 'Nguồn tài liệu:'}</span>
                <span className="font-semibold text-slate-700 bg-slate-50 border border-slate-150 px-2.5 py-1.5 rounded-lg block">
                  {documentTitle ? `${language === 'en' ? 'Translation ' : 'Dịch thuật '}${documentTitle}` : (language === 'en' ? 'External Lookup' : 'Tra cứu ngoài')}
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-500 block mb-1">{language === 'en' ? 'Select Flashcard Deck:' : 'Chọn bộ Flashcard:'}</span>
                <select
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {decks.map(deck => (
                    <option key={deck.id} value={deck.id}>{deck.name}</option>
                  ))}
                  <option value="new">{language === 'en' ? '+ Create new deck...' : '+ Tạo bộ mới...'}</option>
                </select>
              </div>

              {selectedDeckId === 'new' && (
                <div className="space-y-1.5 animate-in fade-in duration-100">
                  <span className="font-bold text-slate-500 block">{language === 'en' ? 'New Deck Name:' : 'Tên bộ Flashcard mới:'}</span>
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
                {t('common.cancel')}
              </button>
              <button
                disabled={isAddingFlashcard || (selectedDeckId === 'new' && !newDeckName.trim())}
                onClick={async () => {
                  setIsAddingFlashcard(true);
                  try {
                    const payload = {
                      deckId: selectedDeckId === 'new' ? null : Number(selectedDeckId),
                      newDeckName: selectedDeckId === 'new' ? newDeckName.trim() : null,
                      source: documentTitle ? `${language === 'en' ? 'Translation ' : 'Dịch thuật '}${documentTitle}` : (language === 'en' ? 'External Lookup' : 'Tra cứu ngoài'),
                      documentId: documentId || null,
                      words: [data.word]
                    };
                    await bulkAddCards(payload);
                    await fetchUserVocabulary();
                    await fetchDecks();
                    setShowDeckModal(false);
                    toast.success(language === 'en' ? "Word added to Flashcard deck successfully!" : "Đã thêm từ vào bộ Flashcard thành công!");
                  } catch (e) {
                    toast.error(e.message || (language === 'en' ? "Failed to save flashcard." : "Lỗi khi lưu Flashcard."));
                  } finally {
                    setIsAddingFlashcard(false);
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition active:scale-97 shadow-md disabled:opacity-50"
              >
                {isAddingFlashcard ? (language === 'en' ? 'Creating...' : 'Đang tạo...') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WordCard;
