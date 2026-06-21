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
  Star,
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
  Check,
  Flame,
  Zap,
  Calendar,
  Gamepad2,
  PenTool,
  Brain,
  History,
  X,
  Dice5
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
  const { vocabList, fetchUserFlashcards, reviewWord, toggleFavorite, updateWordSrsLevel, isLoading, error } = useVocabularyStore();

  const userId = user?.id || 2; // Use ID 2 as fallback/requested default
  
  // Selected deck state
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Player state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledList, setShuffledList] = useState([]);
  const [showRating, setShowRating] = useState(false);

  // Sidebar state
  const [practiceTab, setPracticeTab] = useState('flashcard');

  // Local state for statistics (would come from API in production)
  const stats = {
    streak: 12,
    xp: 1250,
    retentionRate: "87%",
    studyTime: "18h 45m"
  };

  // Decks generation
  const decks = useMemo(() => {
    const list = [];
    
    // Default categories
    const newCount = vocabList.filter(v => v.srsLevel === 0).length;
    const learningCount = vocabList.filter(v => v.srsLevel > 0 && v.srsLevel < 4).length;
    const knownCount = vocabList.filter(v => v.srsLevel >= 4).length;

    list.push({ id: 'new', title: 'Học mới', count: newCount, getWords: () => vocabList.filter(v => v.srsLevel === 0) });
    list.push({ id: 'learning', title: 'Đang học', count: learningCount, getWords: () => vocabList.filter(v => v.srsLevel > 0 && v.srsLevel < 4) });
    list.push({ id: 'known', title: 'Đã thuộc', count: knownCount, getWords: () => vocabList.filter(v => v.srsLevel >= 4) });
    
    return list;
  }, [vocabList]);

  // Initial Fetch from Backend
  useEffect(() => {
    fetchUserFlashcards(userId);
  }, [userId]);

  // Initial Selection
  useEffect(() => {
    if (!selectedDeck && vocabList.length > 0) {
      setSelectedDeck(decks[1] || decks[0]);
    }
  }, [decks, selectedDeck, vocabList]);

  // Active word list management
  const activeList = useMemo(() => {
    if (!selectedDeck) return [];
    const source = selectedDeck.getWords();
    return isShuffled ? shuffledList : source;
  }, [selectedDeck, isShuffled, shuffledList]);

  const currentWord = activeList[currentIndex];
  const progressPercent = activeList.length > 0 ? ((currentIndex + 1) / activeList.length) * 100 : 0;

  // Handlers
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped) setShowRating(true);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setShowRating(false);
    if (currentIndex < activeList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setShowRating(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(activeList.length - 1);
    }
  };

  const handleRating = async (rating) => {
    if (currentWord) {
      await reviewWord(currentWord.id, rating);
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

  const handleRandom = () => {
    const rand = Math.floor(Math.random() * activeList.length);
    setCurrentIndex(rand);
    setIsFlipped(false);
    setShowRating(false);
  };

  const handleMarkAsLearning = async () => {
    if (currentWord) {
      await updateWordSrsLevel(currentWord.id, 1);
      handleNext();
    }
  };

  const handleMarkAsKnown = async () => {
    if (currentWord) {
      await updateWordSrsLevel(currentWord.id, 5);
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

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium">Đang tải dữ liệu từ backend...</p>
    </div>
  );

  if (error) return (
    <div className="p-20 text-center text-red-500">
      <h2 className="text-2xl font-bold mb-2">Lỗi kết nối</h2>
      <p>{error}</p>
      <Button variant="primary" onClick={() => fetchUserFlashcards(userId)} className="mt-4">Thử lại</Button>
    </div>
  );

  if (!selectedDeck) return <div className="p-20 text-center">Đang tải dữ liệu...</div>;

  return (
    <div className="flashcard-container">
      {/* ===== LEFT COLUMN: MAIN CONTENT ===== */}
      <div className="flex-1 min-w-0">
        
        {/* 1. Header */}
        <header className="study-header">
          <div className="deck-info">
            <h1 className="deck-title">
              <BookOpen className="w-6 h-6 text-blue-600" />
              HSK 4 - Từ vựng bài 8
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
          <Button variant="outline" onClick={() => navigate('/vocabulary')} className="rounded-xl border-slate-200">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Thư viện
          </Button>
        </header>

        {/* 2. Stats Bar */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Học mới</span>
            <span className="stat-value text-teal-600">{decks.find(d => d.id === 'new')?.count || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Đang học</span>
            <span className="stat-value text-blue-600">{decks.find(d => d.id === 'learning')?.count || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Đã thuộc</span>
            <span className="stat-value text-emerald-600">{decks.find(d => d.id === 'known')?.count || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Tỉ lệ nhớ</span>
            <span className="stat-value text-purple-600">{stats.retentionRate}</span>
          </div>
        </div>

        {/* 3. Progress Bar */}
        <div className="progress-section">
          <div className="progress-info">
            <div className="progress-text">Đang học thẻ {currentIndex + 1} / {activeList.length}</div>
            <div className="time-remaining">
              <Clock className="w-3.5 h-3.5" />
              5 phút còn lại
            </div>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        {/* 4. Main Flashcard Area */}
        <div className="flashcard-area-wrapper">
          {currentWord ? (
            <>
              <Flashcard 
                word={currentWord} 
                isFlipped={isFlipped} 
                onFlip={handleFlip}
                onFavorite={toggleFavorite}
                isFavorite={currentWord.is_favorite}
              />

              {/* 5. Rating Controls */}
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

              {/* 6. Navigation Bar */}
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
                    Thẻ trước
                  </button>
                  <button className="nav-btn next-btn primary" onClick={handleNext}>
                    Thẻ sau
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <Layers className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800">Bộ từ vựng trống</h3>
              <p className="text-slate-500">Mời bạn quay lại thư viện để thêm từ vựng.</p>
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
            <button className="text-link">Xem chi tiết <ChevronRight className="w-4 h-4 ml-0.5" /></button>
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
                    strokeDashoffset={264 * (1 - 0.88)}
                  />
                  <circle 
                    cx="50" cy="50" r="32" 
                    className="chart-ring ring-cyan"
                    strokeDasharray="201"
                    strokeDashoffset={201 * (1 - 0.75)}
                  />
                  <circle 
                    cx="50" cy="50" r="22" 
                    className="chart-ring ring-purple"
                    strokeDasharray="138"
                    strokeDashoffset={138 * (1 - 0.50)}
                  />
                </svg>
                <div className="chart-center-text">
                  <span className="chart-value">88%</span>
                  <span className="chart-label">Tiên độ tuần</span>
                </div>
              </div>
            </div>

            {/* Stats dots list */}
            <div className="stats-dots-list">
              <div className="stat-dot-item">
                <span className="dot dot-blue"></span>
                <div className="stat-text-group">
                  <span className="stat-name">Thời gian học</span>
                  <span className="stat-figure">0h 16m</span>
                </div>
              </div>
              <div className="stat-dot-item">
                <span className="dot dot-cyan"></span>
                <div className="stat-text-group">
                  <span className="stat-name">Từ vựng đã học</span>
                  <span className="stat-figure">7 / 8</span>
                </div>
              </div>
              <div className="stat-dot-item">
                <span className="dot dot-purple"></span>
                <div className="stat-text-group">
                  <span className="stat-name">Flashcards đã ôn</span>
                  <span className="stat-figure">4 / 8</span>
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
              Flashcards
            </button>
            <button 
              className={`practice-tab ${practiceTab === 'pronunciation' ? 'active' : ''}`}
              onClick={() => setPracticeTab('pronunciation')}
            >
              <Mic className="w-4 h-4" />
              Phát âm
            </button>
          </div>

          <div className="practice-list">
            <div className="practice-item">
              <div className="practice-icon-box bg-blue-50 text-blue-500">
                <Layers className="w-5 h-5" />
              </div>
              <div className="practice-info">
                <span className="practice-title">Ôn tập 8 flashcards</span>
                <span className="practice-status">Đang học</span>
              </div>
              <button className="start-btn">Bắt đầu</button>
            </div>

            <div className="practice-item">
              <div className="practice-icon-box bg-emerald-50 text-emerald-500">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="practice-info">
                <span className="practice-title">Luyện tập từ vựng mới</span>
                <span className="practice-status">Củng cố kiến thức...</span>
              </div>
              <button className="start-btn success">Bắt đầu</button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default FlashcardPage;
