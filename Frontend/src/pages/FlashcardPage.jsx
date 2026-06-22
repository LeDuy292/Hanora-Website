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

  // Fetch from backend on mount
  useEffect(() => {
    fetchUserFlashcards();
  }, []);

  // Selected deck state
  const [selectedDeck, setSelectedDeck] = useState(null);

  // Player state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledList, setShuffledList] = useState([]);
  const [showRating, setShowRating] = useState(false);
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
    
    return { decks: list, counts: { dueCount: dueWords.length, newCount, learningCount, knownCount } };
  }, [vocabList]);

  // Local state for statistics (using user data if available)
  const totalItems = (counts.knownCount + counts.learningCount + counts.newCount) || 1;
  const retentionPercent = Math.round((counts.knownCount / totalItems) * 100);

  const stats = {
    streak: user?.streak || 0,
    xp: user?.xp || 0,
    retentionRate: `${retentionPercent}%`,
    studyTime: user?.todayMinutes ? `${Math.floor(user.todayMinutes / 60)}h ${user.todayMinutes % 60}m` : "0h 0m"
  };

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

    // Logic for "New" deck: Mark word as learning (level 1)
    if (selectedDeck?.id === 'new' && currentWord) {
      await updateWordSrsLevel(currentWord.text, 1);
      // Wait a bit for store to update and activeList to recompute
      if (activeList.length <= 1) {
        setIsSessionComplete(true);
      }
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
  };

  const handleMarkAsKnown = async () => {
    if (currentWord) {
      await updateWordSrsLevel(currentWord.text, 5);
      handleNext();
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
              Đã học {user?.todayMinutes || 0} phút hôm nay
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
                  <button className="nav-btn known-quick-btn" onClick={handleMarkAsKnown}>
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    Đã thuộc
                  </button>
                </div>

                <div className="nav-center-badge">
                  {currentIndex + 1} / {activeList.length}
                </div>

                <div className="nav-group">
                  <button className="nav-btn prev-btn" onClick={handlePrev}>
                    <ChevronLeft className="w-5 h-5" />
                    Trước
                  </button>
                  <button className="nav-btn next-btn primary" onClick={handleNext}>
                    Sau
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 6. Rating Controls */}
              {showRating && (
                <div className="rating-controls">
                  <p className="rating-question">Bạn nhớ từ này như thế nào?</p>
                  <div className="rating-buttons">
                    <button className="rating-btn fail" onClick={() => handleRating('hard')}>
                      <span>❌</span>
                      <span>Quên</span>
                    </button>
                    <button className="rating-btn hard" onClick={() => handleRating('hard')}>
                      <span>😐</span>
                      <span>Khó</span>
                    </button>
                    <button className="rating-btn good" onClick={() => handleRating('good')}>
                      <span>🙂</span>
                      <span>Tạm ổn</span>
                    </button>
                    <button className="rating-btn easy" onClick={() => handleRating('easy')}>
                      <span>😄</span>
                      <span>Dễ</span>
                    </button>
                  </div>
                </div>
              )}
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
                    strokeDashoffset={264 * (1 - Math.min(1, (user?.xp || 0) / 1000))}
                  />
                  <circle 
                    cx="50" cy="50" r="32" 
                    className="chart-ring ring-cyan"
                    strokeDasharray="201"
                    strokeDashoffset={201 * (1 - Math.min(1, decks.find(d => d.id === 'known')?.count / (vocabList.length || 1)))}
                  />
                  <circle 
                    cx="50" cy="50" r="22" 
                    className="chart-ring ring-orange"
                    strokeDasharray="138"
                    strokeDashoffset={138 * (1 - Math.min(1, (user?.todayMinutes || 0) / 30))}
                  />
                </svg>
                <div className="chart-center-text">
                  <span className="chart-value">{Math.round(((decks.find(d => d.id === 'known')?.count || 0) / (vocabList.length || 1)) * 100)}%</span>
                  <span className="chart-label">Hoàn thành</span>
                </div>
              </div>
            </div>

            {/* Stats dots list */}
            <div className="stats-dots-list">
              <div className="stat-dot-item">
                <span className="dot dot-blue"></span>
                <div className="stat-text-group">
                  <span className="stat-name">XP đã nhận</span>
                  <span className="stat-figure">{user?.xp || 0} XP</span>
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
                  <span className="stat-figure">{user?.todayMinutes || 0}m</span>
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
