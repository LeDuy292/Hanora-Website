import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Shuffle, 
  BookOpen,
  Clock,
  ArrowLeft,
  TrendingUp,
  Mic,
  CheckCircle2,
  Flame,
  Zap,
  Lightbulb,
  Target
} from 'lucide-react';
import { useVocabularyStore } from '../store/vocabularyStore';
import { useAuthStore } from '../store/authStore';
import { Flashcard } from '../components/vocabulary/Flashcard';
import { Button } from '../components/common/Button';
import '../styles/FlashcardRedesign.css';

export function FlashcardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const store = useVocabularyStore();
  const { vocabList, reviewWord, updateWordSrsLevel, fetchUserFlashcards } = store;
  
  // Safe access to methods that might be missing in some store versions
  const userId = user?.id || 2; 

  const [customDecks, setCustomDecks] = useState([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState(null);

  // Fetch from backend on mount
  useEffect(() => {
    fetchUserFlashcards();
    const loadCustomDecks = async () => {
      setIsLoadingDecks(true);
      try {
        const res = await store.fetchDecks();
        setCustomDecks(res || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingDecks(false);
      }
    };
    loadCustomDecks();
  }, []);

  // Fetch deck cards when selectedDeck changes
  useEffect(() => {
    if (!selectedDeck) return;
    if (selectedDeck.isCustom) {
      fetchUserFlashcards(selectedDeck.id);
    } else {
      fetchUserFlashcards();
    }
  }, [selectedDeck?.id]);

  // Weak words handed off from the Practice Test ("Ôn lại từ yếu").
  const reviewWords = location.state?.reviewWords || null;

  // Player state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledList, setShuffledList] = useState([]);
  const [showRating, setShowRating] = useState(false);
  const [isMarkedKnown, setIsMarkedKnown] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({ cardsSeen: 0, easyCount: 0, hardCount: 0 });

  // Sidebar state
  const [practiceTab, setPracticeTab] = useState('flashcard');

  // Decks generation and counts
  const { decks, counts } = useMemo(() => {
    const list = [];
    
    // Categories based on SRS Level
    const todayStr = new Date().toISOString().split('T')[0];
    const dueWords = vocabList.filter(v => v.srsLevel > 0 && v.nextReviewDate <= todayStr);
    const newCount = vocabList.filter(v => v.srsLevel === 0).length;
    const learningCount = vocabList.filter(v => v.srsLevel > 0 && v.srsLevel < 4).length;
    const knownCount = vocabList.filter(v => v.srsLevel >= 4).length;

    list.push({ id: 'new', title: 'Học mới', count: newCount, getWords: () => vocabList.filter(v => v.srsLevel === 0) });
    list.push({ id: 'learning', title: 'Đang học', count: learningCount, getWords: () => vocabList.filter(v => v.srsLevel > 0 && v.srsLevel < 4) });
    list.push({ id: 'known', title: 'Đã thuộc', count: knownCount, getWords: () => vocabList.filter(v => v.srsLevel >= 4) });
    // Removed 'due' deck as requested

    // Review deck from a Practice Test weak-word handoff.
    if (reviewWords && reviewWords.length > 0) {
      const reviewSet = new Set(reviewWords);
      const reviewList = vocabList.filter(v => reviewSet.has(v.text));
      if (reviewList.length > 0) {
        list.unshift({ id: 'review', title: 'Ôn từ yếu', count: reviewList.length, getWords: () => vocabList.filter(v => reviewSet.has(v.text)) });
      }
    }

    return { decks: list, counts: { dueCount: dueWords.length, newCount, learningCount, knownCount } };
  }, [vocabList, reviewWords]);

  // Local state for statistics (using user data if available)
  const totalItems = (counts.knownCount + counts.learningCount + counts.newCount) || 1;
  const retentionPercent = Math.round((counts.knownCount / totalItems) * 100);

  const stats = {
    streak: user?.streak || 0,
    xp: user?.xp || 0,
    retentionRate: `${retentionPercent}%`,
    studyTime: user?.todayMinutes ? `${Math.floor(user.todayMinutes / 60)}h ${user.todayMinutes % 60}m` : "0h 0m"
  };

  const levelInfo = useMemo(() => {
    const xp = user?.xp || 0;
    const thresholds = [0, 300, 700, 1200, 1800, 2600, 3600, 5000, 7000, 10000];
    let lvl = 1;
    for (let i = 0; i < thresholds.length; i++) {
      if (xp >= thresholds[i]) {
        lvl = i + 1;
      }
    }
    const currentThreshold = thresholds[lvl - 1];
    const nextThreshold = lvl < 10 ? thresholds[lvl] : 10000;
    const percent = nextThreshold > currentThreshold 
      ? Math.min(100, Math.round(((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100))
      : 100;
    
    return {
      level: lvl,
      currentThreshold,
      nextThreshold,
      percent
    };
  }, [user?.xp]);

  // Initial Selection
  useEffect(() => {
    if (!selectedDeck && vocabList.length > 0) {
      setSelectedDeck(decks[0]);
    }
  }, [decks, selectedDeck, vocabList]);

  // Active word list management
  const activeList = useMemo(() => {
    if (!selectedDeck) return [];
    const source = selectedDeck.getWords();
    if (isShuffled) {
      // Re-filter shuffled list if words were removed/changed status
      return shuffledList.filter(word => source.some(s => s.text === word.text));
    }
    return source;
  }, [selectedDeck, isShuffled, shuffledList, vocabList]);

  const currentWord = activeList[currentIndex];
  const progressPercent = activeList.length > 0 ? ((currentIndex + 1) / activeList.length) * 100 : 0;

  // Reset session when deck changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowRating(false);
    setIsMarkedKnown(false);
    setIsSessionComplete(false);
    setSessionStats({ cardsSeen: 0, easyCount: 0, hardCount: 0 });
  }, [selectedDeck?.id]);

  // Sync index if list grows/shrinks unexpectedly
  useEffect(() => {
    if (currentIndex >= activeList.length && activeList.length > 0) {
      setCurrentIndex(Math.max(0, activeList.length - 1));
    }
  }, [activeList.length, currentIndex]);

  // Handlers
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped) setShowRating(true);
  };

  const handleNext = async () => {
    setIsFlipped(false);
    setShowRating(false);
    setSessionStats(prev => ({ ...prev, cardsSeen: prev.cardsSeen + 1 }));

    const wordToUpdate = currentWord;
    const wasMarkedKnown = isMarkedKnown;

    // Reset toggle for the next card
    setIsMarkedKnown(false);

    if (wordToUpdate) {
      if (wasMarkedKnown) {
        await updateWordSrsLevel(wordToUpdate.text, 5);
      } else if (selectedDeck?.id === 'new') {
        await updateWordSrsLevel(wordToUpdate.text, 1);
      }
    }

    // Wait for update list to recalculate if the word was removed from the activeList
    if ((wasMarkedKnown || selectedDeck?.id === 'new') && activeList.length <= 1) {
      setIsSessionComplete(true);
      return;
    }

    if (currentIndex < activeList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsSessionComplete(true);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setShowRating(false);
    setIsMarkedKnown(false); // Reset toggle when navigating backwards
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(Math.max(0, activeList.length - 1));
    }
  };

  const handleRating = async (rating) => {
    if (currentWord) {
      if (rating === 'easy') setSessionStats(prev => ({ ...prev, easyCount: prev.easyCount + 1 }));
      if (rating === 'hard') setSessionStats(prev => ({ ...prev, hardCount: prev.hardCount + 1 }));
      
      await reviewWord(currentWord.text, rating);
      handleNext();
    }
  };

  const handleToggleShuffle = () => {
    const next = !isShuffled;
    setIsShuffled(next);
    if (next) {
      setShuffledList([...activeList].sort(() => Math.random() - 0.5));
    }
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowRating(false);
    setIsMarkedKnown(false);
  };

  const handleMarkAsKnown = () => {
    if (currentWord) {
      setIsMarkedKnown(prev => !prev);
    }
  };

  // Autoplay
  useEffect(() => {
    let timer;
    if (isPlaying && !showRating) {
      timer = setTimeout(() => {
        handleFlip();
      }, 2000);
    } else if (isPlaying && showRating) {
      timer = setTimeout(() => {
        handleNext();
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, showRating, currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is focusing an input or editable element
      if (
        e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.isContentEditable
      ) {
        return;
      }

      if (isSessionComplete) return;

      switch (e.key) {
        case ' ': // Spacebar
        case 'ArrowUp':
        case 'ArrowDown':
          e.preventDefault(); // Prevent scrolling the page
          handleFlip();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case 'Enter':
        case 'k':
        case 'K':
          e.preventDefault();
          handleMarkAsKnown();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSessionComplete, activeList, currentIndex, isFlipped, currentWord, isMarkedKnown]);

  // Submit session stats when study is completed
  useEffect(() => {
    if (isSessionComplete) {
      const submitSession = async () => {
        try {
          const deckId = selectedDeck?.isCustom ? selectedDeck.id : null;
          await store.completeFlashcardSession({
            deckId,
            cardsStudied: sessionStats.cardsSeen,
            knowCount: sessionStats.easyCount,
            completedDeck: true,
            completedWithoutInterruption: true
          });
        } catch (err) {
          console.error("Error submitting session completion:", err);
        }
      };
      submitSession();
    }
  }, [isSessionComplete]);

  if (!selectedDeck && vocabList.length > 0) return <div className="p-20 text-center">Đang tải dữ liệu...</div>;

  if (vocabList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
          <BookOpen className="w-10 h-10" />
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Thư viện trống</h2>
          <p className="text-slate-500 mb-6">Bạn chưa có từ vựng nào trong sổ tay. Hãy khám phá và thêm từ mới từ trình đọc nhé!</p>
          <Button variant="primary" onClick={() => navigate('/reader')} className="px-8 rounded-xl">
            Đến trình đọc
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flashcard-container page-transition">
      {/* ===== LEFT COLUMN: MAIN CONTENT ===== */}
      <div className="flex-1 min-w-0">
        
        {/* 1. Header */}
        <header className="study-header">
          <div className="deck-info">
            <h1 className="deck-title">
              <BookOpen className="w-6 h-6 text-blue-600" />
              Bộ thẻ: {selectedDeck?.title}
            </h1>
            <div className="deck-meta">
              <span>{activeList.length} từ</span>
              <span className="flex items-center gap-1 text-orange-500">
                <Flame className="w-4 h-4 fill-orange-500" />
                {stats.streak} ngày
              </span>
              <span className="flex items-center gap-1 text-amber-500">
                <Zap className="w-4 h-4 fill-amber-500" />
                {stats.xp} XP
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/vocabulary')} className="rounded-xl border-slate-200">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Thư viện
            </Button>
          </div>
        </header>
        {/* 2. Stats Bar */}
        <div className="stats-grid">
          <div 
            className={`stat-card cursor-pointer transition-all hover:scale-[1.02] ${selectedDeck?.id === 'new' ? 'ring-2 ring-teal-500 border-teal-200' : ''}`}
            onClick={() => { setSelectedDeck(decks.find(d => d.id === 'new')); setCurrentIndex(0); }}
          >
            <span className="stat-label">Học mới</span>
            <span className="stat-value text-teal-600">{counts.newCount}</span>
          </div>
          <div 
            className={`stat-card cursor-pointer transition-all hover:scale-[1.02] ${selectedDeck?.id === 'learning' ? 'ring-2 ring-blue-500 border-blue-200' : ''}`}
            onClick={() => { setSelectedDeck(decks.find(d => d.id === 'learning')); setCurrentIndex(0); }}
          >
            <span className="stat-label">Đang học</span>
            <span className="stat-value text-blue-600">{counts.learningCount}</span>
          </div>
          <div 
            className={`stat-card cursor-pointer transition-all hover:scale-[1.02] ${selectedDeck?.id === 'known' ? 'ring-2 ring-emerald-500 border-emerald-200' : ''}`}
            onClick={() => { setSelectedDeck(decks.find(d => d.id === 'known')); setCurrentIndex(0); }}
          >
            <span className="stat-label text-emerald-500 font-bold">Đã thuộc</span>
            <span className="stat-value text-emerald-600">{counts.knownCount}</span>
          </div>
        </div>


        {/* 3. Progress Bar */}
        <div className="progress-section">
          <div className="progress-info">
            <div className="progress-text">Đang học thẻ {currentIndex + 1} / {activeList.length}</div>
            <div className="time-remaining">
              <Clock className="w-3.5 h-3.5" />
              Đã học {user?.todayMinutes || 0} / {user?.targetDailyMinutes || 20} phút hôm nay
            </div>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        {/* 4. Main Flashcard Area */}
        <div className="flashcard-area-wrapper">
          {isSessionComplete ? (
            <div className="session-complete-view animate-in">
              <div className="celebration-icon">
                <div className="icon-ring"></div>
                <CheckCircle2 className="w-16 h-16 text-emerald-500" />
              </div>
              <h2 className="session-title">Tuyệt vời!</h2>
              <p className="session-subtitle">Bạn đã hoàn thành bộ thẻ <strong>{selectedDeck?.title}</strong></p>
              
              <div className="session-stats-summary">
                <div className="summary-item">
                  <span className="summary-value">{sessionStats.cardsSeen}</span>
                  <span className="summary-label">Thẻ đã học</span>
                </div>
                <div className="summary-item">
                  <span className="summary-value text-emerald-500">{sessionStats.easyCount}</span>
                  <span className="summary-label">Ghi nhớ tốt</span>
                </div>
                <div className="summary-item">
                  <span className="summary-value text-rose-500">{sessionStats.hardCount}</span>
                  <span className="summary-label">Cần xem lại</span>
                </div>
              </div>

              <div className="session-actions">
                <Button 
                  variant="primary" 
                  className="rounded-2xl px-10 py-6 h-auto text-lg shadow-xl shadow-blue-200/50"
                  onClick={() => {
                    setIsSessionComplete(false);
                    setCurrentIndex(0);
                    setSessionStats({ cardsSeen: 0, easyCount: 0, hardCount: 0 });
                    // Jump to next logical deck
                    if (selectedDeck?.id === 'due' && counts.newCount > 0) {
                      setSelectedDeck(decks.find(d => d.id === 'new'));
                    } else if (selectedDeck?.id === 'new' && counts.learningCount > 0) {
                      setSelectedDeck(decks.find(d => d.id === 'learning'));
                    } else {
                      setSelectedDeck(decks.find(d => d.id === 'due') || decks[0]);
                    }
                  }}
                >
                  Học tiếp bộ khác
                </Button>
                <Button 
                  variant="outline" 
                  className="rounded-2xl px-10 py-6 h-auto text-lg border-slate-200"
                  onClick={() => navigate('/vocabulary')}
                >
                  Về thư viện
                </Button>
              </div>
            </div>
          ) : currentWord ? (
            <>
              <Flashcard 
                word={currentWord} 
                isFlipped={isFlipped} 
                onFlip={handleFlip}
                isFavorite={currentWord.is_favorite}
              />

              {/* 5. Navigation Bar */}
              <div className="nav-bar">
                <div className="nav-group">
                  <button className={`nav-btn ${isShuffled ? 'active' : ''}`} onClick={handleToggleShuffle}>
                    <Shuffle className="w-4 h-4" />
                    Trộn
                  </button>
                  <button className={`nav-btn ${isPlaying ? 'active' : ''}`} onClick={() => setIsPlaying(!isPlaying)}>
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    Tự động
                  </button>
                </div>

                <div className="nav-group">
                  <button 
                    className={`nav-btn known-quick-btn transition-all duration-200 ${isMarkedKnown ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-transparent text-slate-600 hover:bg-slate-50'}`} 
                    onClick={handleMarkAsKnown}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${isMarkedKnown ? 'text-white fill-blue-700' : 'text-blue-500'}`} />
                    Đã thuộc
                    <kbd className={`hidden sm:inline-block ml-1.5 px-1 py-0.5 text-[9px] font-mono rounded ${isMarkedKnown ? 'text-blue-100 bg-blue-700 border-blue-800' : 'text-slate-400 bg-slate-50 border border-slate-200'}`}>K</kbd>
                  </button>
                </div>


                <div className="nav-group">
                  <button className="nav-btn prev-btn" onClick={handlePrev}>
                    <kbd className="hidden sm:inline-block mr-1.5 px-1 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-50 border border-slate-200 rounded">←</kbd>
                    <ChevronLeft className="w-5 h-5" />
                    Trước
                  </button>
                  <button className="nav-btn next-btn primary" onClick={handleNext}>
                    Sau
                    <ChevronRight className="w-5 h-5" />
                    <kbd className="hidden sm:inline-block ml-1.5 px-1 py-0.5 text-[9px] font-mono text-blue-200 bg-blue-600 border border-blue-500 rounded">→</kbd>
                  </button>
                </div>
              </div>


            </>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <Layers className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800">Bộ từ vựng trống</h3>
              <p className="text-slate-500">Mời bạn chọn bộ khác hoặc quay lại thư viện.</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== RIGHT COLUMN: SIDEBAR ===== */}
      <aside className="study-sidebar">
        {/* Card 1: Progress */}
        <div className="sidebar-card">
          <div className="sidebar-header-row">
            <h3 className="sidebar-card-title-main">Tiến độ học tập</h3>
            <button className="text-link" onClick={() => navigate('/profile')}>Thành tích <ChevronRight className="w-4 h-4 ml-0.5" /></button>
          </div>
          
          <div className="progress-visual-stats">
            {/* Multi-ring Donut Chart */}
            <div className="chart-container-wrapper">
              <div className="chart-container">
                <svg className="chart-svg" viewBox="0 0 100 100">
                  {/* Track Backgrounds */}
                  <circle cx="50" cy="50" r="42" className="chart-track" />
                  <circle cx="50" cy="50" r="32" className="chart-track" />
                  <circle cx="50" cy="50" r="22" className="chart-track" />
                  
                  {/* Progress Rings (Concentric) */}
                  <circle 
                    cx="50" cy="50" r="42" 
                    className="chart-ring ring-blue"
                    strokeDasharray="264"
                    strokeDashoffset={264 * (1 - levelInfo.percent / 100)}
                  />
                  <circle 
                    cx="50" cy="50" r="32" 
                    className="chart-ring ring-cyan"
                    strokeDasharray="201"
                    strokeDashoffset={201 * (1 - Math.min(1, (decks.find(d => d.id === 'known')?.count || 0) / (vocabList.length || 1)))}
                  />
                  <circle 
                    cx="50" cy="50" r="22" 
                    className="chart-ring ring-orange"
                    strokeDasharray="138"
                    strokeDashoffset={138 * (1 - Math.min(1, (user?.todayMinutes || 0) / (user?.targetDailyMinutes || 20)))}
                  />
                </svg>
                <div className="chart-center-text flex flex-col items-center justify-center">
                  <span className="chart-value text-xl font-black leading-none">{levelInfo.percent}%</span>
                  <span className="chart-label font-bold text-[9px] text-slate-500 mt-1">Level {levelInfo.level}</span>
                  <span className="text-[8px] text-slate-400 font-bold mt-0.5 leading-none">{user?.xp || 0}/{levelInfo.nextThreshold} XP</span>
                </div>
              </div>
            </div>

            {/* Stats dots list */}
            <div className="stats-dots-list">
              <div className="stat-dot-item">
                <span className="dot dot-blue"></span>
                <div className="stat-text-group">
                  <span className="stat-name">Cấp độ & XP</span>
                  <span className="stat-figure">Lvl {levelInfo.level} ({user?.xp || 0}/{levelInfo.nextThreshold} XP)</span>
                </div>
              </div>
              <div className="stat-dot-item">
                <span className="dot dot-cyan"></span>
                <div className="stat-text-group">
                  <span className="stat-name">Từ vựng đã thuộc</span>
                  <span className="stat-figure">{decks.find(d => d.id === 'known')?.count || 0} / {vocabList.length}</span>
                </div>
              </div>
              <div className="stat-dot-item">
                <span className="dot dot-orange"></span>
                <div className="stat-text-group">
                  <span className="stat-name">Thời gian học today</span>
                  <span className="stat-figure">{user?.todayMinutes || 0}m / {user?.targetDailyMinutes || 20}m</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Luyện tập */}
        <div className="sidebar-card">
          <h3 className="sidebar-card-title">
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
            Luyện tập
          </h3>
          
          <div className="practice-header-tabs">
            <button 
              className={`practice-tab ${practiceTab === 'flashcard' ? 'active' : ''}`}
              onClick={() => setPracticeTab('flashcard')}
            >
              <Layers className="w-4 h-4" />
              Lật thẻ
            </button>
            <button 
              className={`practice-tab ${practiceTab === 'pronunciation' ? 'active' : ''}`}
              onClick={() => navigate('/pronunciation')}
            >
              <Mic className="w-4 h-4" />
              Phát âm
            </button>
          </div>

          <div className="practice-list">
            <div className="practice-item highlight-goal">
              <div className="practice-icon-box bg-blue-50 text-blue-600">
                <Target className="w-5 h-5" />
              </div>
              <div className="practice-info">
                <span className="practice-title">Kiểm tra từ vựng</span>
                <span className="practice-status">Lấy {vocabList.length} từ trong Flashcard</span>
              </div>
              <button className="start-btn primary" onClick={() => navigate('/quiz')}>Bắt đầu thi</button>
            </div>

            <div className="practice-item">
              <div className="practice-icon-box bg-blue-50 text-blue-500">
                <Layers className="w-5 h-5" />
              </div>
              <div className="practice-info">
                <span className="practice-title">Học từ mới ({counts.newCount})</span>
                <span className="practice-status">Tiếp tục lật thẻ...</span>
              </div>
              <button className="start-btn" onClick={() => { setSelectedDeck(decks.find(d => d.id === 'new')); setCurrentIndex(0); }}>Bắt đầu</button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default FlashcardPage;
