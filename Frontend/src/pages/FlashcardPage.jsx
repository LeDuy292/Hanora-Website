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
  Mic,
  CheckCircle2,
  Flame,
  Zap,
  Lightbulb,
  Target,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Search,
  Filter,
  Eye,
  EyeOff,
  Sparkles,
  Award,
  BookMarked,
  Volume2
} from 'lucide-react';
import { useVocabularyStore } from '../store/vocabularyStore';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/notificationStore';
import { apiRequest } from '../services/apiClient';
import { Flashcard } from '../components/vocabulary/Flashcard';
import { Button } from '../components/common/Button';
import '../styles/FlashcardRedesign.css';

export function FlashcardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const store = useVocabularyStore();
  const { vocabList, reviewWord, updateWordSrsLevel, fetchUserFlashcards } = store;
  
  // Custom states
  const [activeDeck, setActiveDeck] = useState(null);
  const [customDecks, setCustomDecks] = useState([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState(null);

  // Search/Filter/Sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortOrder, setSortOrder] = useState('created_desc');

  // Edit Deck states
  const [showEditDeckModal, setShowEditDeckModal] = useState(false);
  const [editingDeck, setEditingDeck] = useState(null);
  const [editDeckName, setEditDeckName] = useState('');
  const [editDeckDesc, setEditDeckDesc] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Cards List states
  const [showCardsListModal, setShowCardsListModal] = useState(false);
  const [selectedDeckForWords, setSelectedDeckForWords] = useState(null);
  const [deckWords, setDeckWords] = useState([]);
  const [isLoadingDeckWords, setIsLoadingDeckWords] = useState(false);

  // Add Word states
  const [showAddWordModal, setShowAddWordModal] = useState(false);
  const [addWordDeckId, setAddWordDeckId] = useState(null);
  const [newWordText, setNewWordText] = useState('');
  const [isAddingWord, setIsAddingWord] = useState(false);

  // Settings
  const [showPinyin, setShowPinyin] = useState(true);

  // Study Modes: 'flashcard' | 'write' | 'match' | 'review' | 'ai_test'
  const [studyMode, setStudyMode] = useState('flashcard');

  // Write Mode states
  const [writeCards, setWriteCards] = useState([]);
  const [writeIndex, setWriteIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [writeFeedback, setWriteFeedback] = useState(null);
  const [isSubmitWriteLoading, setIsSubmitWriteLoading] = useState(false);

  // Match Mode states
  const [matchGame, setMatchGame] = useState(null);
  const [matchTiles, setMatchTiles] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);
  const [matchedIds, setMatchedIds] = useState(new Set());
  const [matchGameComplete, setMatchGameComplete] = useState(false);

  // Review Mode states
  const [reviewCards, setReviewCards] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewFlipped, setReviewFlipped] = useState(false);

  // Dashboard Stats
  const [dashboardStats, setDashboardStats] = useState({
    totalDecks: 0,
    totalWords: 0,
    masteredWords: 0,
    learningWords: 0,
    dueForReview: 0,
    totalXp: 0
  });

  const loadCustomDecks = async () => {
    setIsLoadingDecks(true);
    try {
      const res = await store.fetchDecks(searchTerm, filterType, sortOrder);
      setCustomDecks(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDecks(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const res = await store.fetchDashboardStats();
      if (res) {
        setDashboardStats(res);
      }
    } catch (err) {
      console.error("Error loading dashboard stats:", err);
    }
  };

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      loadCustomDecks();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, filterType, sortOrder]);

  useEffect(() => {
    loadDashboardStats();
  }, [vocabList, customDecks]);

  useEffect(() => {
    loadCustomDecks();
  }, []);

  const handleOpenEditModal = (deck) => {
    setEditingDeck(deck);
    setEditDeckName(deck.name);
    setEditDeckDesc(deck.description || '');
    setShowEditDeckModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editDeckName.trim()) {
      toast.warning('Tên bộ Flashcard không được để trống.');
      return;
    }
    setIsSavingEdit(true);
    try {
      await store.updateDeck(editingDeck.id, editDeckName.trim(), editDeckDesc.trim() || null);
      toast.success('Cập nhật bộ Flashcard thành công!');
      setShowEditDeckModal(false);
      loadCustomDecks();
    } catch (err) {
      toast.error('Lỗi khi cập nhật bộ Flashcard.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteDeck = (deckId) => {
    toast.confirm(
      'Bạn có chắc chắn muốn xóa bộ Flashcard này? Toàn bộ thẻ trong bộ sẽ bị xóa.',
      async () => {
        try {
          await store.deleteDeck(deckId);
          toast.success('Xóa bộ Flashcard thành công!');
          loadCustomDecks();
          if (activeDeck && activeDeck.id === deckId) {
            setActiveDeck(null);
          }
        } catch (err) {
          toast.error('Lỗi khi xóa bộ Flashcard.');
        }
      },
      'Xóa bộ Flashcard'
    );
  };

  const handleDuplicateDeck = async (deckId) => {
    try {
      await store.duplicateDeck(deckId);
      toast.success('Sao chép bộ thẻ thành công!');
      loadCustomDecks();
    } catch (err) {
      toast.error('Không thể sao chép bộ thẻ.');
    }
  };

  const handleOpenWordsModal = async (deck) => {
    setSelectedDeckForWords(deck);
    setShowCardsListModal(true);
    setIsLoadingDeckWords(true);
    try {
      const data = await apiRequest(`/flashcard?deckId=${deck.id}`, { auth: true });
      setDeckWords(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingDeckWords(false);
    }
  };

  const handleRemoveCard = async (cardId) => {
    toast.confirm(
      'Bạn có chắc chắn muốn loại bỏ từ này khỏi bộ thẻ?',
      async () => {
        try {
          await store.removeCardFromDeck(cardId);
          toast.success('Đã loại bỏ từ khỏi bộ thẻ thành công!');
          setDeckWords(prev => prev.filter(w => w.id !== cardId));
          loadCustomDecks();
        } catch (err) {
          toast.error('Lỗi khi loại bỏ từ.');
        }
      },
      'Loại bỏ từ'
    );
  };

  const handleOpenAddWordModal = (deck) => {
    setAddWordDeckId(deck.id);
    setNewWordText('');
    setShowAddWordModal(true);
  };

  const handleAddWordSubmit = async (e) => {
    e.preventDefault();
    if (!newWordText.trim()) {
      toast.warning('Vui lòng nhập từ vựng.');
      return;
    }
    setIsAddingWord(true);
    try {
      await store.bulkAddCards({
        deckId: addWordDeckId,
        words: [newWordText.trim()]
      });
      toast.success('Đã thêm từ vựng thành công!');
      setShowAddWordModal(false);
      loadCustomDecks();
    } catch (err) {
      toast.error('Lỗi khi thêm từ.');
    } finally {
      setIsAddingWord(false);
    }
  };

  // TTS helper
  const speakChineseText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      window.speechSynthesis.speak(utterance);
    }
  };

  // Review Mode actions
  const startReviewMode = async () => {
    try {
      const data = await store.fetchReviewCards(activeDeck?.id === 'all' ? null : activeDeck?.id);
      setReviewCards(data || []);
      setReviewIndex(0);
      setReviewFlipped(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewFeedback = async (know) => {
    if (reviewCards.length === 0) return;
    const card = reviewCards[reviewIndex];
    try {
      await store.submitReview(card.id, know ? 0 : 1, 0); // 0 = Know, 1 = StillLearning
      setReviewFlipped(false);
      if (reviewIndex < reviewCards.length - 1) {
        setReviewIndex(reviewIndex + 1);
      } else {
        toast.success('Chúc mừng! Bạn đã hoàn thành phiên ôn tập.');
        startReviewMode();
        loadDashboardStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Write Mode actions
  const startWriteMode = async () => {
    try {
      const data = await store.fetchWriteCards(activeDeck?.id === 'all' ? null : activeDeck?.id);
      setWriteCards(data || []);
      setWriteIndex(0);
      setUserAnswer('');
      setWriteFeedback(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleWriteSubmit = async (e) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;
    setIsSubmitWriteLoading(true);
    const card = writeCards[writeIndex];
    try {
      const isCorrect = await store.submitWriteAnswer(card.id, userAnswer.trim());
      setWriteFeedback({ isCorrect, correctAnswer: card.correctAnswer });
      speakChineseText(card.text);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitWriteLoading(false);
    }
  };

  const handleWriteNext = () => {
    setUserAnswer('');
    setWriteFeedback(null);
    if (writeIndex < writeCards.length - 1) {
      setWriteIndex(writeIndex + 1);
    } else {
      toast.success('Chúc mừng! Bạn đã hoàn thành bài tập viết.');
      startWriteMode();
    }
  };

  // Match Mode actions
  const startMatchMode = async () => {
    try {
      const game = await store.startMatchGame(activeDeck?.id === 'all' ? null : activeDeck?.id);
      if (game && !game.error) {
        setMatchGame(game);
        const tiles = [];
        game.cards.forEach(c => {
          tiles.push({ id: `w-${c.id}`, cardId: c.id, type: 'word', text: c.word });
          tiles.push({ id: `m-${c.id}`, cardId: c.id, type: 'meaning', text: c.meaning });
        });
        setMatchTiles(tiles.sort(() => Math.random() - 0.5));
        setSelectedTile(null);
        setMatchedIds(new Set());
        setMatchGameComplete(false);
      } else {
        toast.warning(game?.error || 'Cần ít nhất 4 từ để bắt đầu Match Mode.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTileClick = async (tile) => {
    if (matchedIds.has(tile.cardId)) return;
    if (!selectedTile) {
      setSelectedTile(tile);
    } else {
      if (selectedTile.id === tile.id) {
        setSelectedTile(null);
        return;
      }
      if (selectedTile.cardId === tile.cardId && selectedTile.type !== tile.type) {
        setMatchedIds(prev => {
          const next = new Set(prev);
          next.add(tile.cardId);
          return next;
        });
        setSelectedTile(null);
        await store.submitMatchPair(matchGame.matchGameId, selectedTile.cardId, tile.cardId);
        
        if (matchedIds.size + 1 === matchGame.cards.length) {
          setMatchGameComplete(true);
          await store.completeMatchGame(matchGame.matchGameId);
          toast.success('Nhận thưởng Match Mode thành công!');
        }
      } else {
        setSelectedTile(tile);
      }
    }
  };

  // Switch tabs
  useEffect(() => {
    if (!activeDeck) return;
    if (studyMode === 'write') {
      startWriteMode();
    } else if (studyMode === 'match') {
      startMatchMode();
    } else if (studyMode === 'review') {
      startReviewMode();
    } else if (studyMode === 'ai_test') {
      navigate('/quiz');
    }
  }, [studyMode, activeDeck?.id]);

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

  // Decks generation and counts
  const { decks, counts } = useMemo(() => {
    const list = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const dueWords = vocabList.filter(v => v.srsLevel > 0 && v.nextReviewDate <= todayStr);
    const newCount = vocabList.filter(v => v.srsLevel === 0).length;
    const learningCount = vocabList.filter(v => v.srsLevel > 0 && v.srsLevel < 4).length;
    const knownCount = vocabList.filter(v => v.srsLevel >= 4).length;

    list.push({ id: 'all', title: 'Tất cả', count: vocabList.length, getWords: () => vocabList });
    list.push({ id: 'new', title: 'Học mới', count: newCount, getWords: () => vocabList.filter(v => v.srsLevel === 0) });
    list.push({ id: 'learning', title: 'Đang học', count: learningCount, getWords: () => vocabList.filter(v => v.srsLevel > 0 && v.srsLevel < 4) });
    list.push({ id: 'known', title: 'Đã thuộc', count: knownCount, getWords: () => vocabList.filter(v => v.srsLevel >= 4) });

    return { decks: list, counts: { dueCount: dueWords.length, newCount, learningCount, knownCount } };
  }, [vocabList]);

  // Initial Selection inside player
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
      return shuffledList.filter(word => source.some(s => s.text === word.text));
    }
    return source;
  }, [selectedDeck, isShuffled, shuffledList, vocabList]);

  const currentWord = activeList[currentIndex];
  const progressPercent = activeList.length > 0 ? ((currentIndex + 1) / activeList.length) * 100 : 0;

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

  // Reset player session
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowRating(false);
    setIsMarkedKnown(false);
    setIsSessionComplete(false);
    setSessionStats({ cardsSeen: 0, easyCount: 0, hardCount: 0 });
  }, [selectedDeck?.id, activeDeck?.id]);

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
  }, [isSessionComplete, activeList, currentIndex, isFlipped, currentWord]);

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
    setIsMarkedKnown(false);

    if (wordToUpdate) {
      if (wasMarkedKnown) {
        await updateWordSrsLevel(wordToUpdate.text, 5);
      } else if (selectedDeck?.id === 'new') {
        await updateWordSrsLevel(wordToUpdate.text, 1);
      }
    }

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
    setIsMarkedKnown(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(Math.max(0, activeList.length - 1));
    }
  };

  const handleMarkAsKnown = () => {
    if (currentWord) {
      setIsMarkedKnown(prev => !prev);
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

  // Submit session stats when study is completed
  useEffect(() => {
    if (isSessionComplete) {
      const submitSession = async () => {
        try {
          const deckId = activeDeck?.id !== 'all' ? activeDeck.id : null;
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

  // RENDER 1: Deck Manager Dashboard
  if (activeDeck === null) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
        {/* Dashboard Header */}
        <div className="flex justify-between items-center bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Flashcard của tôi</h1>
            <p className="text-slate-500 text-sm mt-1">Quản lý và ôn tập từ vựng cá nhân hóa theo phương pháp SRS</p>
          </div>
          <button 
            onClick={() => navigate('/vocabulary')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-6 rounded-2xl transition shadow-md hover:shadow-lg text-sm select-none"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo bộ mới từ Sổ tay</span>
          </button>
        </div>

        {/* Dashboard Stats Panel */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center items-center text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tổng bộ thẻ</span>
            <span className="text-3xl font-black text-slate-800 mt-1">{dashboardStats.totalDecks}</span>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center items-center text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tổng số từ</span>
            <span className="text-3xl font-black text-slate-800 mt-1">{dashboardStats.totalWords}</span>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center items-center text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Đã thuộc</span>
            <span className="text-3xl font-black text-emerald-600 mt-1">{dashboardStats.masteredWords}</span>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center items-center text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Đang học</span>
            <span className="text-3xl font-black text-blue-600 mt-1">{dashboardStats.learningWords}</span>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center items-center text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cần ôn tập</span>
            <span className="text-3xl font-black text-amber-600 mt-1">{dashboardStats.dueForReview}</span>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center items-center text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tích lũy XP</span>
            <span className="text-3xl font-black text-purple-600 mt-1">+{dashboardStats.totalXp} XP</span>
          </div>
        </div>

        {/* Search, Filter, Sort Toolbar */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Tìm kiếm bộ Flashcard, nguồn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600 focus:outline-none"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="learning">Đang học</option>
                <option value="not_started">Chưa học</option>
                <option value="completed">Hoàn thành</option>
                <option value="recently_created">Tạo gần đây</option>
                <option value="recently_studied">Học gần đây</option>
              </select>
            </div>

            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600 focus:outline-none ml-auto md:ml-0"
            >
              <option value="created_desc">Ngày tạo (Mới nhất)</option>
              <option value="created_asc">Ngày tạo (Cũ nhất)</option>
              <option value="name_asc">Tên A-Z</option>
              <option value="name_desc">Tên Z-A</option>
              <option value="progress_desc">Tiến độ cao nhất</option>
              <option value="words_desc">Số từ nhiều nhất</option>
            </select>
          </div>
        </div>

        {/* Decks Grid list */}
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Bộ thẻ của tôi ({customDecks.length})</span>
          </h2>
          
          {isLoadingDecks ? (
            <div className="text-center py-20 font-bold text-slate-450 animate-pulse text-sm">Đang tải danh sách bộ thẻ...</div>
          ) : customDecks.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <BookMarked className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">Không tìm thấy bộ thẻ nào</h3>
              <p className="text-slate-400 text-xs mt-1">Hãy thử tìm kiếm từ khóa khác hoặc tạo bộ mới từ sổ tay từ vựng.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customDecks.map((deck) => (
                <div 
                  key={deck.id} 
                  className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-5 relative overflow-hidden group"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="inline-block px-2.5 py-0.5 border bg-emerald-50 border-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-wider rounded-md">
                        Tự Tạo
                      </span>
                      
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleDuplicateDeck(deck.id)}
                          className="text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-slate-50 rounded-lg transition"
                          title="Sao chép bộ thẻ"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleOpenAddWordModal(deck)}
                          className="text-slate-400 hover:text-blue-600 p-1.5 hover:bg-slate-50 rounded-lg transition"
                          title="Thêm từ mới"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(deck)}
                          className="text-slate-400 hover:text-blue-600 p-1.5 hover:bg-slate-50 rounded-lg transition"
                          title="Sửa thông tin"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleOpenWordsModal(deck)}
                          className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-slate-50 rounded-lg transition"
                          title="Danh sách từ"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteDeck(deck.id)}
                          className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-slate-50 rounded-lg transition"
                          title="Xóa bộ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-extrabold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{deck.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {deck.description || "Không có mô tả cho bộ thẻ này."}
                    </p>
                    
                    <div className="space-y-1.5 pt-2 text-xs text-slate-500 font-semibold">
                      <div className="flex justify-between items-center text-[11px]">
                        <span>Nguồn: <span className="text-slate-700">{deck.source || 'Sổ tay'}</span></span>
                        <span className="text-slate-700 font-bold">{deck.learnedWords || 0} / {deck.totalWords} từ đã học</span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${deck.totalWords > 0 ? ((deck.masteredWords || 0) / deck.totalWords) * 100 : 0}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-[9px] text-slate-400 pt-1 font-bold">
                        <span>Tạo: {new Date(deck.createdAt).toLocaleDateString('vi-VN')}</span>
                        <span>Học: {deck.lastStudiedAt ? new Date(deck.lastStudiedAt).toLocaleDateString('vi-VN') : 'Chưa học'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
                    <button 
                      onClick={() => {
                        setActiveDeck({ id: deck.id, title: deck.name });
                        setStudyMode('flashcard');
                        fetchUserFlashcards(deck.id);
                      }}
                      className="flex-grow flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition active:scale-95 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Học thẻ</span>
                    </button>
                    <button 
                      onClick={() => navigate('/quiz')}
                      className="flex-grow flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition active:scale-95 shadow-sm"
                    >
                      <Target className="w-3.5 h-3.5 text-blue-500" />
                      <span>Kiểm tra AI</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Edit custom deck details */}
        {showEditDeckModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4 text-slate-700">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-800">Sửa bộ Flashcard</h3>
                <button 
                  onClick={() => setShowEditDeckModal(false)}
                  className="text-slate-400 hover:text-slate-655 font-bold text-sm"
                >
                  Đóng
                </button>
              </div>
              
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Tên bộ Flashcard</label>
                  <input
                    type="text"
                    value={editDeckName}
                    onChange={(e) => setEditDeckName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Mô tả bộ thẻ</label>
                  <textarea
                    value={editDeckDesc}
                    onChange={(e) => setEditDeckDesc(e.target.value)}
                    rows={3}
                    placeholder="Mô tả mục tiêu học tập của bộ này..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditDeckModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-slate-50 transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition"
                  >
                    {isSavingEdit ? 'Đang lưu...' : 'Lưu lại'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: View word list inside deck and support word deletion */}
        {showCardsListModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4 text-slate-700">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Từ vựng trong bộ</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">{selectedDeckForWords?.name} ({deckWords.length} từ)</p>
                </div>
                <button 
                  onClick={() => setShowCardsListModal(false)}
                  className="text-slate-400 hover:text-slate-655 font-bold text-sm"
                >
                  Đóng
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1 font-sans">
                {isLoadingDeckWords ? (
                  <div className="text-center py-8 text-xs font-bold text-slate-400 animate-pulse">Đang tải danh sách từ...</div>
                ) : deckWords.length === 0 ? (
                  <div className="text-center py-8 text-xs font-bold text-slate-400">Bộ thẻ chưa có từ vựng nào.</div>
                ) : (
                  deckWords.map((card) => (
                    <div key={card.id} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition">
                      <div className="text-left">
                        <span className="font-extrabold text-slate-800 text-sm">{card.text}</span>
                        <span className="text-[11px] text-slate-400 ml-2 font-bold">[{card.pinyin}]</span>
                        <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">{card.translation}</p>
                      </div>
                      <button 
                        onClick={() => handleRemoveCard(card.id)}
                        className="text-red-500 hover:text-red-700 font-black text-xs uppercase tracking-wider px-2.5 py-1.5 hover:bg-red-50 rounded-xl transition"
                      >
                        Loại bỏ
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Inline Word Adder */}
        {showAddWordModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4 text-slate-700 font-sans">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-800">Thêm từ vào bộ Flashcard</h3>
                <button 
                  onClick={() => setShowAddWordModal(false)}
                  className="text-slate-400 hover:text-slate-655 font-bold text-sm"
                >
                  Đóng
                </button>
              </div>
              
              <form onSubmit={handleAddWordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Từ vựng tiếng Trung</label>
                  <input
                    type="text"
                    value={newWordText}
                    onChange={(e) => setNewWordText(e.target.value)}
                    placeholder="Ví dụ: 学习, 苹果, 谢谢..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Hệ thống sẽ tự động tra cứu Pinyin, nghĩa tiếng Việt và các câu ví dụ minh họa bằng AI.</p>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddWordModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-slate-50 transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingWord}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition"
                  >
                    {isAddingWord ? 'Đang thêm...' : 'Thêm từ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // RENDER 2: Play Modes View
  return (
    <div className="flashcard-container page-transition">
      {/* ===== LEFT COLUMN: MAIN CONTENT ===== */}
      <div className="flex-1 min-w-0">
        {/* Back to list and header */}
        <div className="flex justify-between items-center bg-white border border-slate-100 p-4 rounded-3xl shadow-sm">
          <button 
            onClick={() => setActiveDeck(null)}
            className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-650 font-bold py-2 px-4 rounded-2xl transition text-xs select-none"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Danh sách bộ thẻ</span>
          </button>
        <div className="text-right">
          <h2 className="text-base font-extrabold text-slate-800 line-clamp-1">{activeDeck?.title}</h2>
          <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Chế độ: {studyMode.toUpperCase()}</span>
        </div>
      </div>

      {/* Modes Navigation Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
        <button 
          onClick={() => setStudyMode('flashcard')}
          className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition ${
            studyMode === 'flashcard' ? 'bg-white text-blue-650 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Lật Thẻ
        </button>
        <button 
          onClick={() => setStudyMode('review')}
          className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition ${
            studyMode === 'review' ? 'bg-white text-blue-650 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Ôn tập SRS
        </button>
        <button 
          onClick={() => setStudyMode('write')}
          className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition ${
            studyMode === 'write' ? 'bg-white text-blue-650 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Write Mode
        </button>
        <button 
          onClick={() => setStudyMode('match')}
          className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition ${
            studyMode === 'match' ? 'bg-white text-blue-650 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Match Game
        </button>
        <button 
          onClick={() => navigate('/quiz')}
          className="flex-1 text-center py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 transition"
        >
          AI Test
        </button>
      </div>

      {/* SUB-VIEW 1: Flashcard player */}
      {studyMode === 'flashcard' && (
        <div className="flashcard-container page-transition" style={{ gridTemplateColumns: '1fr', padding: 0, minHeight: 'auto' }}>
          <div className="flex-1 min-w-0">
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-2.5 mb-6 bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 max-w-max select-none shadow-sm">
              {decks.map(d => {
                const isActive = selectedDeck?.id === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => { setSelectedDeck(d); setCurrentIndex(0); }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 select-none ${
                      isActive 
                        ? 'bg-white text-blue-605 shadow-md border border-slate-200/40 scale-[1.02]' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                    }`}
                  >
                    {d.id === 'all' && <BookOpen className="w-3.5 h-3.5 text-blue-500" />}
                    {d.id === 'new' && <Plus className="w-3.5 h-3.5 text-teal-500" />}
                    {d.id === 'learning' && <Zap className="w-3.5 h-3.5 text-blue-500" />}
                    {d.id === 'known' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    <span>{d.title}</span>
                    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-black rounded-md ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/60 text-slate-500'
                    }`}>
                      {d.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Toolbar Settings */}
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-3xl border border-slate-100 mb-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowPinyin(!showPinyin)}
                  className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 transition"
                >
                  {showPinyin ? <Eye className="w-3.5 h-3.5 text-blue-500" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                  <span>Pinyin: {showPinyin ? 'Bật' : 'Tắt'}</span>
                </button>
              </div>

              {/* Dynamic stats */}
              <div className="flex gap-4 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1 text-orange-500">
                  <Flame className="w-4 h-4 fill-orange-500" />
                  {user?.streak || 0} ngày
                </span>
                <span className="flex items-center gap-1 text-amber-500">
                  <Zap className="w-4 h-4 fill-amber-500" />
                  {user?.xp || 0} XP
                </span>
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
                  <p className="session-subtitle">Bạn đã hoàn thành bộ thẻ <strong>{activeDeck?.title}</strong></p>
                  
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
                        setActiveDeck(null);
                      }}
                    >
                      Học tiếp bộ khác
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
                    showPinyin={showPinyin}
                  />

                  {/* 5. Navigation Bar */}
                  <div className="nav-bar mt-4">
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
                        className={`nav-btn known-quick-btn transition-all duration-200 ${isMarkedKnown ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`} 
                        onClick={handleMarkAsKnown}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${isMarkedKnown ? 'text-white fill-blue-700' : 'text-blue-500'}`} />
                        <span>Đã thuộc</span>
                        <kbd className={`hidden sm:inline-block ml-1.5 px-1 py-0.5 text-[9px] font-mono rounded ${isMarkedKnown ? 'text-blue-100 bg-blue-700 border-blue-800' : 'text-slate-400 bg-slate-50 border border-slate-200'}`}>K</kbd>
                      </button>
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
        </div>
      )}

      {/* SUB-VIEW 2: SRS Review Mode */}
      {studyMode === 'review' && (
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-5 h-5 text-blue-500" />
              <span>Ôn tập theo lịch lặp lại ngắt quãng (SRS)</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">Thẻ {reviewIndex + 1} / {reviewCards.length}</span>
          </div>

          {reviewCards.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-bold text-xs">Không có thẻ nào đến hạn ôn tập trong bộ này!</div>
          ) : (
            <div className="space-y-6">
              {/* Render Card Flipper locally */}
              <div 
                onClick={() => setReviewFlipped(!reviewFlipped)}
                className="bg-slate-50 border border-slate-200/60 rounded-3xl min-h-60 flex flex-col items-center justify-center p-8 text-center cursor-pointer select-none transition hover:bg-slate-100/50 relative"
              >
                <span className="absolute top-4 left-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Click to flip</span>
                
                {!reviewFlipped ? (
                  <div className="space-y-3">
                    <h2 className="text-4xl font-extrabold text-slate-800">{reviewCards[reviewIndex].text}</h2>
                    {showPinyin && <p className="text-sm font-semibold text-slate-500">[{reviewCards[reviewIndex].pinyin}]</p>}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        speakChineseText(reviewCards[reviewIndex].text);
                      }}
                      className="bg-white border border-slate-200 p-2 rounded-full hover:bg-slate-50 transition"
                    >
                      <Volume2 className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      {reviewCards[reviewIndex].wordType}
                    </span>
                    <h3 className="text-xl font-black text-slate-800">{reviewCards[reviewIndex].translation}</h3>
                    {reviewCards[reviewIndex].examples && reviewCards[reviewIndex].examples.length > 0 && (
                      <div className="max-w-md pt-2 text-xs border-t border-slate-200/50 mt-2 space-y-1">
                        <p className="font-extrabold text-slate-700">{reviewCards[reviewIndex].examples[0].zhText}</p>
                        <p className="text-slate-500 italic">{reviewCards[reviewIndex].examples[0].viText}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Review Buttons */}
              <div className="flex gap-4">
                <button 
                  onClick={() => handleReviewFeedback(false)}
                  className="flex-1 py-3 bg-rose-50 border border-rose-200 hover:bg-rose-100/50 text-rose-700 font-bold rounded-2xl text-xs uppercase tracking-wider transition active:scale-95"
                >
                  Chưa thuộc (Lặp lại sớm)
                </button>
                <button 
                  onClick={() => handleReviewFeedback(true)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition active:scale-95 shadow-sm"
                >
                  Đã thuộc (Nhận XP +5)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: Write Mode */}
      {studyMode === 'write' && (
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
              <Edit3 className="w-5 h-5 text-blue-500" />
              <span>Write Mode - Nhập nghĩa tiếng Việt</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">Từ {writeIndex + 1} / {writeCards.length}</span>
          </div>

          {writeCards.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-bold text-xs">Không có thẻ nào để luyện viết trong bộ này!</div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-8 text-center space-y-4">
                <h2 className="text-4xl font-extrabold text-slate-800">{writeCards[writeIndex].text}</h2>
                {showPinyin && <p className="text-sm font-semibold text-slate-400">[{writeCards[writeIndex].pinyin}]</p>}
                <button 
                  onClick={() => speakChineseText(writeCards[writeIndex].text)}
                  className="mx-auto bg-white border border-slate-200 p-2.5 rounded-full hover:bg-slate-50 transition flex items-center justify-center"
                >
                  <Volume2 className="w-4 h-4 text-blue-600" />
                </button>
              </div>

              {!writeFeedback ? (
                <form onSubmit={handleWriteSubmit} className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Nhập nghĩa tiếng Việt của từ này..."
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
                    autoFocus
                    required
                  />
                  <button 
                    type="submit"
                    disabled={isSubmitWriteLoading}
                    className="w-full py-3 bg-blue-650 hover:bg-blue-650 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition active:scale-95 shadow-sm"
                  >
                    {isSubmitWriteLoading ? 'Đang kiểm tra...' : 'Gửi đáp án'}
                  </button>
                </form>
              ) : (
                <div className="space-y-4 animate-in">
                  <div className={`p-5 rounded-2xl border text-center ${
                    writeFeedback.isCorrect 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    <h4 className="text-sm font-extrabold">{writeFeedback.isCorrect ? '✓ CHÍNH XÁC (+10 XP)' : '✗ CHƯA ĐÚNG (+5 XP)'}</h4>
                    <p className="text-xs mt-1.5">Đáp án đúng: <span className="font-extrabold">{writeFeedback.correctAnswer}</span></p>
                  </div>
                  <button 
                    onClick={handleWriteNext}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition active:scale-95"
                  >
                    Tiếp tục
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 4: Match Game */}
      {studyMode === 'match' && (
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
              <Award className="w-5 h-5 text-blue-500" />
              <span>Match Game - Trò chơi ghép cặp</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">Đã ghép: {matchedIds.size} / {matchGame?.cards?.length || 0} cặp</span>
          </div>

          {matchGameComplete ? (
            <div className="text-center py-12 space-y-4 animate-in">
              <div className="inline-block p-4 bg-amber-50 border border-amber-200 rounded-full text-amber-500">
                <Award className="w-12 h-12" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Hoàn thành màn chơi!</h3>
              <p className="text-slate-500 text-xs">Bạn đã ghép thành công tất cả các thẻ và nhận thưởng XP thành công.</p>
              <button 
                onClick={startMatchMode}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition active:scale-95 shadow-sm"
              >
                Chơi màn mới
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {matchTiles.map((tile) => {
                const isMatched = matchedIds.has(tile.cardId);
                const isSelected = selectedTile?.id === tile.id;
                
                if (isMatched) {
                  return (
                    <div 
                      key={tile.id} 
                      className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl min-h-24 flex items-center justify-center p-4 text-center text-xs font-extrabold opacity-40 transition"
                    >
                      ✓ Match
                    </div>
                  );
                }

                return (
                  <div 
                    key={tile.id}
                    onClick={() => handleTileClick(tile)}
                    className={`border rounded-2xl min-h-24 flex items-center justify-center p-4 text-center cursor-pointer text-xs font-bold transition select-none ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-md scale-[1.02]' 
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 text-slate-700'
                    }`}
                  >
                    {tile.text}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
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
              className={`practice-tab ${studyMode === 'flashcard' ? 'active' : ''}`}
              onClick={() => setStudyMode('flashcard')}
            >
              <Layers className="w-4 h-4" />
              Lật thẻ
            </button>
            <button 
              className="practice-tab"
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
