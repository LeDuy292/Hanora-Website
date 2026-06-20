import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Shuffle, 
  Volume2, 
  Trash2, 
  Search, 
  Settings, 
  Info,
  BookOpen,
  FolderOpen,
  GraduationCap,
  Clock,
  ArrowLeft,
  TrendingUp,
  Mic,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  Check
} from 'lucide-react';
import { useVocabularyStore } from '../store/vocabularyStore';
import { Flashcard } from '../components/vocabulary/Flashcard';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';

export function FlashcardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { vocabList, removeWord, updateWordSrsLevel } = useVocabularyStore();

  const selectedWords = location.state?.selectedWords;
  const focusNewLearning = location.state?.focusNewLearning;

  // Selected deck state (null means show selector, otherwise is the selected deck object)
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Search state inside active deck study
  const [searchQuery, setSearchQuery] = useState('');

  // Quizlet Player state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledList, setShuffledList] = useState([]);
  const [translationFirst, setTranslationFirst] = useState(false);

  // Sidebar practice tab state
  const [practiceTab, setPracticeTab] = useState('flashcards');

  // Progress Tracking Mode state
  const [isProgressTrackingMode, setIsProgressTrackingMode] = useState(false);

  // Generate study decks dynamically
  const getDecks = () => {
    const decks = [];
    // 0. Selected Vocab from VocabularyPage
    if (selectedWords && selectedWords.length > 0) {
      decks.push({
        id: 'selected',
        title: 'Từ vựng được chọn',
        description: `Học ${selectedWords.length} từ vựng bạn đã đánh dấu chọn từ trang từ vựng.`,
        count: selectedWords.length,
        type: 'system',
        icon: Layers,
        color: 'from-blue-600 to-emerald-500',
        stackColor: 'bg-emerald-100/60',
        stackColor2: 'bg-emerald-50/70',
        getWords: () => selectedWords
      });
    }

    // 1. Learning State Decks (for quick access from progress indicators)
    const newLearningWords = focusNewLearning && selectedWords && selectedWords.length > 0
      ? selectedWords
      : vocabList.filter(item => {
        const state = item.srsLevel >= 4 ? 'known' : item.srsLevel > 0 ? 'learning' : 'not_started';
        return state === 'unreviewed' || state === 'not_started';
      });
    // Always add new-learning deck (even if empty)
    decks.push({
      id: 'new-learning',
      title: 'Học mới',
      description: focusNewLearning && selectedWords && selectedWords.length > 0
        ? 'Các từ vựng bạn chọn để ôn tập ngay.'
        : 'Các từ vựng mới thêm hoặc chưa bắt đầu học.',
      count: newLearningWords.length,
      type: 'learning',
      icon: Lightbulb,
      color: 'from-teal-500 to-cyan-400',
      stackColor: 'bg-teal-100/60',
      stackColor2: 'bg-teal-50/70',
      getWords: () => newLearningWords
    });

    const learningWords = vocabList.filter(item => {
      const state = item.srsLevel >= 4 ? 'known' : item.srsLevel > 0 ? 'learning' : 'not_started';
      return state === 'learning';
    });
    // Always add learning deck (even if empty)
    decks.push({
      id: 'learning',
      title: 'Đang học',
      description: 'Các từ vựng đang trong quá trình học tập.',
      count: learningWords.length,
      type: 'learning',
      icon: GraduationCap,
      color: 'from-blue-500 to-indigo-400',
      stackColor: 'bg-blue-100/60',
      stackColor2: 'bg-blue-50/70',
      getWords: () => vocabList.filter(item => {
        const state = item.srsLevel >= 4 ? 'known' : item.srsLevel > 0 ? 'learning' : 'not_started';
        return state === 'learning';
      })
    });

    const knownWords = vocabList.filter(item => {
      const state = item.srsLevel >= 4 ? 'known' : item.srsLevel > 0 ? 'learning' : 'not_started';
      return state === 'known';
    });
    // Always add known deck (even if empty)
    decks.push({
      id: 'known',
      title: 'Đã thuộc',
      description: 'Các từ vựng đã thuộc và cần ôn tập định kỳ.',
      count: knownWords.length,
      type: 'learning',
      icon: Check,
      color: 'from-emerald-500 to-green-400',
      stackColor: 'bg-emerald-100/60',
      stackColor2: 'bg-emerald-50/70',
      getWords: () => vocabList.filter(item => {
        const state = item.srsLevel >= 4 ? 'known' : item.srsLevel > 0 ? 'learning' : 'not_started';
        return state === 'known';
      })
    });

    // 3. SRS Due vocab
    const todayStr = new Date().toISOString().split('T')[0];
    const dueWords = vocabList.filter(item => !item.nextReviewDate || item.nextReviewDate <= todayStr);
    if (dueWords.length > 0) {
      decks.push({
        id: 'due',
        title: 'Từ cần ôn tập hôm nay',
        description: 'Tập hợp các từ vựng đã đến lịch hẹn ôn tập theo Spaced Repetition.',
        count: dueWords.length,
        type: 'system',
        icon: Clock,
        color: 'from-amber-500 to-orange-500',
        stackColor: 'bg-amber-100/60',
        stackColor2: 'bg-amber-50/70',
        getWords: () => vocabList.filter(item => !item.nextReviewDate || item.nextReviewDate <= todayStr)
      });
    }

    // 4. Document Decks
    const docGroups = {};
    vocabList.forEach(item => {
      const docTitle = item.documentTitle || 'Từ vựng chung';
      if (!docGroups[docTitle]) {
        docGroups[docTitle] = [];
      }
      docGroups[docTitle].push(item);
    });

    Object.keys(docGroups).forEach((title, idx) => {
      decks.push({
        id: `doc-${idx}`,
        title: title,
        description: title === 'Từ vựng chung' 
          ? 'Các từ vựng chung hệ thống hoặc không thuộc tài liệu cụ thể nào.' 
          : `Học phần từ vựng trích xuất từ tài liệu "${title}".`,
        count: docGroups[title].length,
        type: 'document',
        icon: FolderOpen,
        color: 'from-slate-700 to-slate-550',
        stackColor: 'bg-slate-200/60',
        stackColor2: 'bg-slate-100/70',
        getWords: () => vocabList.filter(item => (item.documentTitle || 'Từ vựng chung') === title)
      });
    });

    // 5. HSK Decks
    const hsk1Words = vocabList.filter(item => item.hsk === 1);
    const hsk2Words = vocabList.filter(item => item.hsk === 2);
    const hsk3Words = vocabList.filter(item => item.hsk === 3);

    if (hsk1Words.length > 0) {
      decks.push({
        id: 'hsk-1',
        title: 'Từ vựng HSK 1',
        description: 'Các từ vựng sơ cấp thuộc khung chuẩn HSK cấp độ 1.',
        count: hsk1Words.length,
        type: 'hsk',
        icon: GraduationCap,
        color: 'from-emerald-500 to-teal-400',
        stackColor: 'bg-emerald-100/60',
        stackColor2: 'bg-emerald-50/70',
        getWords: () => vocabList.filter(item => item.hsk === 1)
      });
    }
    if (hsk2Words.length > 0) {
      decks.push({
        id: 'hsk-2',
        title: 'Từ vựng HSK 2',
        description: 'Các từ vựng trung cấp thuộc khung chuẩn HSK cấp độ 2.',
        count: hsk2Words.length,
        type: 'hsk',
        icon: GraduationCap,
        color: 'from-blue-500 to-indigo-400',
        stackColor: 'bg-blue-100/60',
        stackColor2: 'bg-blue-50/70',
        getWords: () => vocabList.filter(item => item.hsk === 2)
      });
    }
    if (hsk3Words.length > 0) {
      decks.push({
        id: 'hsk-3',
        title: 'Từ vựng HSK 3',
        description: 'Các từ vựng nâng cao thuộc khung chuẩn HSK cấp độ 3.',
        count: hsk3Words.length,
        type: 'hsk',
        icon: GraduationCap,
        color: 'from-purple-500 to-pink-400',
        stackColor: 'bg-purple-100/60',
        stackColor2: 'bg-purple-50/70',
        getWords: () => vocabList.filter(item => item.hsk === 3)
      });
    }

    return decks;
  };

  const decks = getDecks();

  // Calculate learning state counts for progress indicators
  const learningStateCounts = useMemo(() => {
    const newLearning = vocabList.filter(item => {
      const state = item.srsLevel >= 4 ? 'known' : item.srsLevel > 0 ? 'learning' : 'not_started';
      return state === 'unreviewed' || state === 'not_started';
    }).length;
    const learning = vocabList.filter(item => {
      const state = item.srsLevel >= 4 ? 'known' : item.srsLevel > 0 ? 'learning' : 'not_started';
      return state === 'learning';
    }).length;
    const known = vocabList.filter(item => {
      const state = item.srsLevel >= 4 ? 'known' : item.srsLevel > 0 ? 'learning' : 'not_started';
      return state === 'known';
    }).length;
    return { newLearning, learning, known };
  }, [vocabList]);

  // Auto-select the 'selected' deck if passed, otherwise default to 'learning' deck on initial mount
  useEffect(() => {
    if (!selectedDeck && !hasAutoSelected && vocabList.length > 0) {
      let targetDeckId = null;
      if (focusNewLearning && selectedWords && selectedWords.length > 0) {
        targetDeckId = 'new-learning';
      } else if (selectedWords && selectedWords.length > 0) {
        targetDeckId = 'selected';
      }
      if (!targetDeckId) {
        // Try to select 'learning' deck first, then 'due', then first available deck
        targetDeckId = decks.find(d => d.id === 'learning')?.id || 
                      decks.find(d => d.id === 'due')?.id || 
                      decks[0]?.id;
      }
      const defaultDeck = decks.find(d => d.id === targetDeckId);
      if (defaultDeck) {
        setSelectedDeck(defaultDeck);
        setHasAutoSelected(true);
      }
    }
  }, [vocabList, selectedDeck, hasAutoSelected, decks, selectedWords, focusNewLearning]);

  // If a deck is selected, fetch its fresh words from the store dynamically
  const getSelectedDeckWords = () => {
    if (!selectedDeck) return [];
    const deckConfig = decks.find(d => d.id === selectedDeck.id);
    return deckConfig ? deckConfig.getWords() : [];
  };

  const selectedDeckWords = getSelectedDeckWords();

  // Filter words inside active study set based on search query
  const filteredList = selectedDeckWords.filter(item => {
    const matchesSearch = 
      item.text.includes(searchQuery) ||
      item.pinyin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.translation.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesSearch;
  });

  const activeList = isShuffled ? shuffledList : filteredList;
  const activeIndex = Math.min(currentIndex, Math.max(0, activeList.length - 1));

  // Reset indices and states on deck change
  const selectDeck = (deck) => {
    setSelectedDeck(deck);
    setSearchQuery('');
    setIsShuffled(false);
    setShuffledList([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsPlaying(false);
  };

  // Toggle shuffle deck order
  const toggleShuffle = () => {
    const nextShuffled = !isShuffled;
    setIsShuffled(nextShuffled);
    if (nextShuffled) {
      setShuffledList([...filteredList].sort(() => 0.5 - Math.random()));
    }
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Handle deck navigation
  const handleNext = () => {
    if (isProgressTrackingMode) {
      // Progress tracking mode: right arrow moves current word to "known" (srsLevel = 4)
      const selectedDeckWords = getSelectedDeckWords();
      const filteredWords = selectedDeckWords.filter(item => {
        const matchesSearch = 
          item.text.includes(searchQuery) ||
          item.pinyin.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.translation.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      });
      const activeWords = isShuffled ? shuffledList : filteredWords;
      const currentWord = activeWords[activeIndex];
      if (currentWord) {
        updateWordSrsLevel(currentWord.text, 4);
      }
    } else {
      // Normal mode: next flashcard
      setIsFlipped(false);
      if (activeList.length === 0) return;
      if (activeIndex < activeList.length - 1) {
        setCurrentIndex(activeIndex + 1);
      } else {
        setCurrentIndex(0); // loop back
      }
    }
  };

  const handlePrev = () => {
    if (isProgressTrackingMode) {
      // Progress tracking mode: left arrow moves current word to "learning" (srsLevel = 1)
      const selectedDeckWords = getSelectedDeckWords();
      const filteredWords = selectedDeckWords.filter(item => {
        const matchesSearch = 
          item.text.includes(searchQuery) ||
          item.pinyin.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.translation.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      });
      const activeWords = isShuffled ? shuffledList : filteredWords;
      const currentWord = activeWords[activeIndex];
      if (currentWord) {
        updateWordSrsLevel(currentWord.text, 1);
      }
    } else {
      // Normal mode: previous flashcard
      setIsFlipped(false);
      if (activeList.length === 0) return;
      if (activeIndex > 0) {
        setCurrentIndex(activeIndex - 1);
      } else {
        setCurrentIndex(activeList.length - 1);
      }
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!selectedDeck) return;

    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, activeList.length, isFlipped, selectedDeck, isProgressTrackingMode, activeList, isShuffled, searchQuery]);

  // Autoplay loop timer
  useEffect(() => {
    if (!isPlaying || activeList.length === 0 || !selectedDeck) return;
    const interval = setInterval(() => {
      if (!isFlipped) {
        setIsFlipped(true);
      } else {
        handleNext();
      }
    }, 3500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isFlipped, activeIndex, activeList.length, selectedDeck]);

  const speakWord = (e, text) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      window.speechSynthesis.speak(utterance);
    }
  };

  const loadWordIntoPlayer = (wordText) => {
    const idx = activeList.findIndex(w => w.text === wordText);
    if (idx !== -1) {
      setCurrentIndex(idx);
      setIsFlipped(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getHskBadgeColor = (hsk) => {
    if (hsk === 1) return "bg-emerald-50 text-emerald-600 border-emerald-100";
    if (hsk === 2) return "bg-blue-50 text-blue-600 border-blue-100";
    return "bg-purple-50 text-purple-600 border-purple-100";
  };

  // --- VIEW 1: VOCABULARY NOTEBOOK EMPTY STATE ---
  if (vocabList.length === 0) {
    return (
      <div className="max-w-md mx-auto py-12 page-transition">
        <div className="text-center p-8 bg-white border border-slate-100 rounded-3xl space-y-6 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Sổ Tay Từ Vựng Trống</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Bạn chưa lưu bất kỳ từ vựng nào. Hãy đọc các tài liệu học tập trong Trình Đọc và click vào từ mới để lưu chúng vào đây.
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/reader')} className="w-full">
            Mở Trình Đọc
          </Button>
        </div>
      </div>
    );
  }

  // --- VIEW 2: DECK SELECTION SCREEN (DECK SELECTOR) ---
  if (!selectedDeck) {
    const systemDecks = decks.filter(d => d.type === 'system');
    const learningDecks = decks.filter(d => d.type === 'learning');
    const docDecks = decks.filter(d => d.type === 'document');
    const hskDecks = decks.filter(d => d.type === 'hsk');

    return (
      <div className="space-y-12 page-transition max-w-6xl mx-auto py-6">
        {/* Glowing Head Banner */}
        <div className="text-center space-y-3 relative py-6">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-24 bg-blue-400/5 blur-3xl rounded-full pointer-events-none"></div>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50/80 border border-blue-100/50 px-3 py-1 rounded-full uppercase tracking-wider">Học phần từ vựng</span>
          <h2 className="text-3xl md:text-4xl font-extrabold font-display text-slate-850 tracking-tight">Thư viện Flashcard của bạn</h2>
          <p className="text-sm text-slate-500 max-w-lg mx-auto font-medium leading-relaxed">
            Chọn một bộ từ vựng dưới đây để bắt đầu bài học ghi nhớ lật thẻ. Các từ được phân nhóm tự động theo HSK hoặc tài liệu đọc của bạn.
          </p>
        </div>

        {/* SECTION 1: SYSTEM DECKS */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Layers className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Học phần tổng hợp</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {systemDecks.map(deck => {
              const IconComp = deck.icon;
              return (
                <div key={deck.id} className="relative group cursor-pointer" onClick={() => selectDeck(deck)}>
                  {/* Decorative Deck Stacks */}
                  <div className={`absolute inset-0 ${deck.stackColor} rounded-3xl translate-x-2.5 translate-y-2.5 opacity-55 transition-all group-hover:translate-x-3.5 group-hover:translate-y-3.5 duration-300 shadow-sm`}></div>
                  <div className={`absolute inset-0 ${deck.stackColor2} rounded-3xl translate-x-1.5 translate-y-1.5 opacity-80 transition-all group-hover:translate-x-2 group-hover:translate-y-2 duration-300 shadow-sm`}></div>
                  
                  {/* Main Deck Card */}
                  <div className="relative bg-white border border-slate-100 rounded-3xl p-7 flex flex-col justify-between h-48 shadow-[0_4px_20px_rgba(15,23,42,0.02)] hover:shadow-[0_12px_30px_rgba(37,99,235,0.06)] hover:border-blue-200 transition-all duration-300">
                    <div className="flex justify-between items-start">
                      <div className="space-y-3">
                        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${deck.color} text-white flex items-center justify-center shadow-lg shadow-blue-500/10`}>
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-lg font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors">{deck.title}</h4>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm mt-1">{deck.description}</p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-blue-600 bg-blue-50 border border-blue-100/50 px-3 py-1 rounded-xl">{deck.count} thẻ</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 font-bold group-hover:gap-2.5 transition-all mt-4">
                      <span>Bắt đầu ôn tập</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: LEARNING STATE DECKS */}
        {learningDecks.length > 0 && (
          <div className="space-y-5 pt-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <GraduationCap className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Học phần theo tiến độ</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {learningDecks.map(deck => {
                const IconComp = deck.icon;
                return (
                  <div key={deck.id} className="relative group cursor-pointer" onClick={() => selectDeck(deck)}>
                    {/* Decorative Deck Stacks */}
                    <div className={`absolute inset-0 ${deck.stackColor} rounded-2xl translate-x-2 translate-y-2 opacity-50 transition-all group-hover:translate-x-3 group-hover:translate-y-3 duration-300 shadow-sm`}></div>
                    <div className={`absolute inset-0 ${deck.stackColor2} rounded-2xl translate-x-1 translate-y-1 opacity-70 transition-all group-hover:translate-x-1.5 group-hover:translate-y-1.5 duration-300 shadow-sm`}></div>
                    
                    {/* Main Deck Card */}
                    <div className="relative bg-white border border-slate-100 rounded-2xl p-6 flex flex-col justify-between h-44 shadow-[0_4px_20px_rgba(15,23,42,0.02)] hover:shadow-[0_12px_24px_rgba(37,99,235,0.06)] hover:border-blue-200 transition-all duration-300">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${deck.color} text-white flex items-center justify-center shadow-sm`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-lg">{deck.count} từ</span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">{deck.title}</h4>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1 line-clamp-2">{deck.description}</p>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-blue-600 font-bold group-hover:gap-2.5 transition-all mt-3">
                        <span>Học ngay</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 3: DOCUMENT DECKS */}
        {docDecks.length > 0 && (
          <div className="space-y-5 pt-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <FolderOpen className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Học phần theo tài liệu</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {docDecks.map(deck => {
                const IconComp = deck.icon;
                return (
                  <div key={deck.id} className="relative group cursor-pointer" onClick={() => selectDeck(deck)}>
                    {/* Decorative Deck Stacks */}
                    <div className={`absolute inset-0 ${deck.stackColor} rounded-2xl translate-x-2 translate-y-2 opacity-50 transition-all group-hover:translate-x-3 group-hover:translate-y-3 duration-300 shadow-sm`}></div>
                    <div className={`absolute inset-0 ${deck.stackColor2} rounded-2xl translate-x-1 translate-y-1 opacity-70 transition-all group-hover:translate-x-1.5 group-hover:translate-y-1.5 duration-300 shadow-sm`}></div>
                    
                    {/* Main Deck Card */}
                    <div className="relative bg-white border border-slate-100 rounded-2xl p-6 flex flex-col justify-between h-44 shadow-[0_4px_20px_rgba(15,23,42,0.02)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.04)] hover:border-blue-200 transition-all duration-300">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center">
                            <IconComp className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-lg">{deck.count} từ</span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">{deck.title}</h4>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1 line-clamp-2">{deck.description}</p>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-blue-600 font-bold group-hover:gap-2.5 transition-all mt-3">
                        <span>Lật thẻ ngay</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 4: HSK DECKS */}
        {hskDecks.length > 0 && (
          <div className="space-y-5 pt-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <GraduationCap className="w-4.5 h-4.5 text-emerald-555" style={{ color: '#10b981' }} />
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Học phần theo cấp độ HSK</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {hskDecks.map(deck => {
                const IconComp = deck.icon;
                return (
                  <div key={deck.id} className="relative group cursor-pointer" onClick={() => selectDeck(deck)}>
                    {/* Decorative Deck Stacks */}
                    <div className={`absolute inset-0 ${deck.stackColor} rounded-2xl translate-x-2 translate-y-2 opacity-50 transition-all group-hover:translate-x-3 group-hover:translate-y-3 duration-300 shadow-sm`}></div>
                    <div className={`absolute inset-0 ${deck.stackColor2} rounded-2xl translate-x-1 translate-y-1 opacity-70 transition-all group-hover:translate-x-1.5 group-hover:translate-y-1.5 duration-300 shadow-sm`}></div>

                    {/* Main Deck Card */}
                    <div className="relative bg-white border border-slate-100 rounded-2xl p-6 flex flex-col justify-between h-44 shadow-[0_4px_20px_rgba(15,23,42,0.02)] hover:shadow-[0_12px_24px_rgba(16,185,129,0.05)] hover:border-emerald-250 transition-all duration-300">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${deck.color} text-white flex items-center justify-center shadow-sm`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-550 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-lg">{deck.count} từ</span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-800 group-hover:text-emerald-600 transition-colors line-clamp-1">{deck.title}</h4>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1 line-clamp-2">{deck.description}</p>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-blue-600 font-bold group-hover:gap-2.5 transition-all mt-3">
                        <span>Học học phần</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- VIEW 3: STUDY PLAYBACK SCREEN (REARRANGED & BEAUTIFIED) ---
  const currentWord = activeList[activeIndex];
  const progressPercent = activeList.length > 0 ? ((activeIndex + 1) / activeList.length) * 100 : 0;

  // Tính toán thống kê học tập
  const todayStr = new Date().toISOString().split('T')[0];
  const totalWords = vocabList.length;
  const learnedWords = vocabList.filter(w => w.srsLevel >= 1).length;
  const masteredFlashcards = vocabList.filter(w => w.srsLevel >= 3).length;
  const totalFlashcards = vocabList.length;
  const weeklyGoalPercent = totalWords > 0 ? Math.min(100, Math.round((learnedWords / totalWords) * 100)) : 0;
  const dueToday = vocabList.filter(item => !item.nextReviewDate || item.nextReviewDate <= todayStr);

  // Tính thời gian học ước lượng (dựa trên số từ đã ôn)
  const studiedCount = vocabList.filter(w => w.srsLevel > 0).length;
  const estHours = Math.floor(studiedCount * 2.3 / 60);
  const estMins = Math.floor(studiedCount * 2.3 % 60);

  return (
    <div className="page-transition max-w-7xl mx-auto py-4 px-4">
      <div className="flex gap-8 items-start">
      {/* ===== MAIN CONTENT (LEFT) ===== */}
      <div className="flex-1 min-w-0 space-y-6 max-w-4xl">
      {/* Learning State Progress Indicators */}
      <div className="grid grid-cols-3 gap-4">
        <div 
          className={`bg-white border rounded-2xl p-4 flex items-center gap-3 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-teal-300 ${
            selectedDeck?.id === 'new-learning' ? 'border-teal-500 ring-2 ring-teal-500/10' : 'border-slate-100'
          }`}
          onClick={() => {
            const deck = decks.find(d => d.id === 'new-learning');
            if (deck) selectDeck(deck);
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 text-teal-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học mới</div>
            <div className="text-lg font-extrabold text-slate-800">{learningStateCounts.newLearning}</div>
          </div>
        </div>
        <div 
          className={`bg-white border rounded-2xl p-4 flex items-center gap-3 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-blue-300 ${
            selectedDeck?.id === 'learning' ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-100'
          }`}
          onClick={() => {
            const deck = decks.find(d => d.id === 'learning');
            if (deck) selectDeck(deck);
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đang học</div>
            <div className="text-lg font-extrabold text-slate-800">{learningStateCounts.learning}</div>
          </div>
        </div>
        <div 
          className={`bg-white border rounded-2xl p-4 flex items-center gap-3 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-emerald-300 ${
            selectedDeck?.id === 'known' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-100'
          }`}
          onClick={() => {
            const deck = decks.find(d => d.id === 'known');
            if (deck) selectDeck(deck);
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đã thuộc</div>
            <div className="text-lg font-extrabold text-slate-800">{learningStateCounts.known}</div>
          </div>
        </div>
      </div>

      {/* 2. QUIZLET FLASHCARD PLAYER INTERFACE */}
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Top visual study side header toggle */}
        <div className="flex items-center justify-between bg-white border border-slate-100 px-5 py-3 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-655">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <span>Tiến trình: {activeIndex + 1} / {activeList.length} thẻ</span>
          </div>
          
          <button 
            onClick={() => setTranslationFirst(!translationFirst)}
            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-50 border border-blue-100/30 px-3.5 py-2 rounded-xl transition-colors"
            title="Đổi mặt thẻ hiển thị trước"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Mặt trước: {translationFirst ? 'Nghĩa' : 'Chữ Hán'}</span>
          </button>
        </div>

        {/* Dynamic Glowing Progress Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner relative z-10 -mb-4">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 via-sky-500 to-blue-500 transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {activeList.length > 0 && currentWord ? (
          <div className="space-y-6">
            
            {/* The 3D Flashcard Component */}
            <div className="pt-2">
              <Flashcard 
                word={currentWord}
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped(!isFlipped)}
                translationFirst={translationFirst}
              />
            </div>

            {/* Rearranged Controllers glass card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                {/* Shuffle Button */}
                <button
                  onClick={toggleShuffle}
                  className={`p-3 rounded-xl border transition-all ${
                    isShuffled 
                      ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-400 hover:text-slate-655 hover:bg-slate-50'
                  }`}
                  title={isShuffled ? "Hủy trộn" : "Trộn ngẫu nhiên"}
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                {/* Autoplay Play/Pause */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-3 rounded-xl border transition-all ${
                    isPlaying 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-400 hover:text-slate-655 hover:bg-slate-50'
                  }`}
                  title={isPlaying ? "Tạm dừng" : "Tự động chạy thẻ"}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                {/* Progress Tracking Mode Toggle */}
                <button
                  onClick={() => setIsProgressTrackingMode(!isProgressTrackingMode)}
                  className={`p-3 rounded-xl border transition-all ${
                    isProgressTrackingMode 
                      ? 'bg-purple-50 border-purple-200 text-purple-600 shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-400 hover:text-slate-655 hover:bg-slate-50'
                  }`}
                  title={isProgressTrackingMode ? "Tắt chế độ theo dõi" : "Bật chế độ theo dõi tiến độ"}
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
              </div>

              {/* Central controls display count indicators */}
              <div className="text-center font-display text-xs font-bold text-slate-400">
                {isProgressTrackingMode ? (
                  <span className="text-purple-600">← Đang học | Đã học →</span>
                ) : (
                  <span>Thẻ {activeIndex + 1} / {activeList.length}</span>
                )}
              </div>

              {/* Prev & Next arrows */}
              <div className="flex gap-2.5">
                <button
                  onClick={handlePrev}
                  className="p-3 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                  title={isProgressTrackingMode ? "Di chuyển từ này sang Đang học" : "Thẻ trước"}
                >
                  <ChevronLeft className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-3 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
                  title={isProgressTrackingMode ? "Di chuyển từ này sang Đã học" : "Thẻ tiếp theo"}
                >
                  <ChevronRight className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Keyboard shortcut helper bar */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex justify-center items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-slate-400" /> Phím tắt:</span>
              <span>Space: lật thẻ</span>
              <span>&bull;</span>
              {isProgressTrackingMode ? (
                <span className="text-purple-600">← / →: di chuyển từ</span>
              ) : (
                <span>← / →: chuyển thẻ</span>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
            <p className="text-sm text-slate-500 font-bold">
              {selectedDeckWords.length === 0 
                ? `Phần "${selectedDeck?.title}" chưa có từ vựng nào.` 
                : 'Không tìm thấy từ vựng nào khớp với bộ lọc tìm kiếm của bạn.'}
            </p>
          </div>
        )}
      </div>

      </div>{/* end main content */}

      {/* ===== RIGHT SIDEBAR ===== */}
      <aside className="w-72 shrink-0 space-y-5 sticky top-6 self-start">

        {/* CARD 1: Tiến độ học tập */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-extrabold text-slate-800">Tiến độ học tập</h3>
            <button className="text-xs font-bold text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors">
              Xem chi tiết <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Circular progress + stats row */}
          <div className="flex items-center gap-5">
            {/* SVG Donut Chart */}
            <div className="relative shrink-0 w-[120px] h-[120px] drop-shadow-lg">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <defs>
                  <linearGradient id="gradientLearned" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="1" />
                  </linearGradient>
                  <linearGradient id="gradientMastered" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="1" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Background track - outer */}
                <circle cx="50" cy="50" r="42" fill="none" stroke="#e0e7ff" strokeWidth="8" opacity="0.6" />
                {/* Learned segment - outer ring */}
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="url(#gradientLearned)"
                  strokeWidth="8"
                  strokeDasharray={`${(learnedWords / Math.max(totalWords, 1)) * 263.9} 263.9`}
                  strokeLinecap="round"
                  filter="url(#glow)"
                  style={{ 
                    transition: 'stroke-dasharray 0.8s ease-out',
                    opacity: 0.9
                  }}
                />
                {/* Mastered segment - middle ring */}
                <circle
                  cx="50" cy="50" r="32"
                  fill="none"
                  stroke="url(#gradientMastered)"
                  strokeWidth="7"
                  strokeDasharray={`${(masteredFlashcards / Math.max(totalFlashcards, 1)) * 201.1} 201.1`}
                  strokeLinecap="round"
                  filter="url(#glow)"
                  style={{ 
                    transition: 'stroke-dasharray 0.8s ease-out',
                    opacity: 0.85
                  }}
                />
                {/* Weekly goal - center circle */}
                <circle 
                  cx="50" cy="50" r="24" 
                  fill="none" 
                  stroke="#e0e7ff" 
                  strokeWidth="1" 
                  opacity="0.4"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50/40 to-indigo-50/20 rounded-full">
                <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{weeklyGoalPercent}%</span>
                <span className="text-[9px] font-bold text-slate-500 leading-tight text-center mt-0.5">Tiến độ<br/>tuần này</span>
              </div>
            </div>

            {/* Stats list */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
                  <span className="text-xs text-slate-500 font-semibold">Thời gian học</span>
                </div>
                <span className="text-xs font-extrabold text-slate-700">{estHours}h {estMins}m</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shrink-0"></span>
                  <span className="text-xs text-slate-500 font-semibold">Từ vựng đã học</span>
                </div>
                <span className="text-xs font-extrabold text-slate-700">{learnedWords} / {totalWords}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
                  <span className="text-xs text-slate-500 font-semibold">Flashcards đã ôn</span>
                </div>
                <span className="text-xs font-extrabold text-slate-700">{masteredFlashcards} / {totalFlashcards}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: Luyện tập */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
            <h3 className="text-base font-extrabold text-slate-800">Luyện tập</h3>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-50 border border-slate-100 rounded-xl p-0.5 mb-4">
            <button
              onClick={() => setPracticeTab('flashcards')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                practiceTab === 'flashcards'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-100'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Layers className="w-4 h-4" />
              Flashcards
            </button>
            <button
              onClick={() => setPracticeTab('pronunciation')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                practiceTab === 'pronunciation'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-100'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Mic className="w-4 h-4" />
              Phát âm
            </button>
          </div>

          {/* Tab content */}
          {practiceTab === 'flashcards' ? (
            <div className="space-y-3">
              {/* Item 1: Ôn tập due cards */}
              <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-800 leading-tight">
                    Ôn tập {dueToday.length} flashcards
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                    {selectedDeck?.title || 'Từ vựng cần ôn hôm nay'}
                  </p>
                </div>
                <button
                  onClick={() => { setCurrentIndex(0); setIsFlipped(false); }}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-extrabold rounded-lg transition-all shadow-sm shadow-blue-500/20 active:scale-95 shrink-0"
                >
                  Bắt đầu
                </button>
              </div>

              {/* Item 2: Học toàn bộ */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-800 leading-tight">
                    Luyện tập từ vựng mới
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                    Củng cố kiến thức hôm nay
                  </p>
                </div>
                <button
                  onClick={() => { setCurrentIndex(0); setIsFlipped(false); setIsShuffled(false); }}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-extrabold rounded-lg transition-all shadow-sm shadow-emerald-500/20 active:scale-95 shrink-0"
                >
                  Bắt đầu
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pronunciation item */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <Mic className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-800 leading-tight">
                    Luyện phát âm từ vựng
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                    Cải thiện phát âm chuẩn xác
                  </p>
                </div>
                <button
                  onClick={() => navigate('/pronunciation')}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-extrabold rounded-lg transition-all shadow-sm shadow-emerald-500/20 active:scale-95 shrink-0"
                >
                  Bắt đầu
                </button>
              </div>

              {/* Practice all sounds */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Volume2 className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-800 leading-tight">
                    Nghe phát âm từng thẻ
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Chạy TTS tự động
                  </p>
                </div>
                <button
                  onClick={() => { setIsPlaying(true); }}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-extrabold rounded-lg transition-all shadow-sm shadow-blue-500/20 active:scale-95 shrink-0"
                >
                  Bắt đầu
                </button>
              </div>
            </div>
          )}
        </div>

      </aside>
    </div>
    </div>
  );
}
export default FlashcardPage;
