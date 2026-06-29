import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookMarked, 
  Layers, 
  FileText, 
  Search, 
  Filter, 
  Volume2, 
  Star, 
  MoreHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  GraduationCap, 
  Check, 
  ChevronDown, 
  Mic, 
  X,
  Lightbulb,
  Plus
} from 'lucide-react';
import { useVocabularyStore } from '../store/vocabularyStore';
import { useAuthStore } from '../store/authStore';
import { getMyDocuments } from '../lib/api';
import { toast } from '../store/notificationStore';

// Static database of details for HSK words (consistent with Flashcard.jsx)
const WORD_DETAILS_DB = {
  "学习": {
    translation: "Học tập; nghiên cứu",
    exampleChinese: "我喜欢学习汉语。",
    examplePinyin: "Wǒ xǐhuan xuéxí Hànyǔ.",
    exampleVietnamese: "Tôi thích học tiếng Trung.",
    context: "Trong giao tiếp, “学习” thường đi với các môn học hoặc kỹ năng cụ thể."
  },
  "喜欢": {
    translation: "Thích; ưa thích",
    exampleChinese: "我不喜欢喝茶。",
    examplePinyin: "Wǒ bù xǐhuan hē chá.",
    exampleVietnamese: "Tôi không thích uống trà.",
    context: "Biểu đạt sở thích cá nhân đối với người, đồ vật hoặc hành động."
  },
  "咖啡": {
    translation: "Cà phê",
    exampleChinese: "我喝了一杯热咖啡。",
    examplePinyin: "Wǒ hēle yī bēi rè kāfēi.",
    exampleVietnamese: "Tôi đã uống một cốc cà phê nóng.",
    context: "Từ mượn phiên âm từ tiếng Anh 'coffee' trong tiếng Trung."
  },
  "将军": {
    translation: "Tướng quân",
    exampleChinese: "这位将军在战场上表现得非常勇敢。",
    examplePinyin: "Zhè wèi jiāngjūn zài zhànchǎng shàng biǎoxiàn de fēicháng yǒnggǎn.",
    exampleVietnamese: "Vị tướng quân này đã thể hiện rất dũng cảm trên chiến trường.",
    context: "Chỉ người chỉ huy quân đội, có vai trò quan trọng trong việc lãnh đạo chiến lược."
  },
  "重要": {
    translation: "Quan trọng",
    exampleChinese: "这件事对他非常重要。",
    examplePinyin: "Zhè jiàn shì duì wǒ fēicháng zhòngyào.",
    exampleVietnamese: "Việc này đối với tôi vô cùng quan trọng.",
    context: "Tính từ dùng để nhấn mạnh tính chất chủ chốt, thiết yếu của vấn đề."
  },
  "士兵": {
    translation: "Binh lính",
    exampleChinese: "士兵们正在接受严格的训练。",
    examplePinyin: "Shìbīngmen zhèngzài jiēshòu yángé de xùnliàn.",
    exampleVietnamese: "Các binh lính đang nhận được sự huấn luyện nghiêm khắc.",
    context: "Chỉ quân lính hoặc chiến sĩ trong đơn vị quân đội."
  },
  "进攻": {
    translation: "Tiến công",
    exampleChinese: "军队向敌人的阵地发起进攻。",
    examplePinyin: "Jūnduì xiàng dírén de zhèndì fāqǐ jìngōng.",
    exampleVietnamese: "Quân đội phát động tiến công về phía trận địa của quân địch.",
    context: "Hành động tấn công chủ động trong quân sự hoặc các cuộc thi đấu."
  },
  "撤退": {
    translation: "Rút lui",
    exampleChinese: "为了保存实力，部队决定撤退。",
    examplePinyin: "Wèile bǎocún shílì, bùduì juédìng chètui.",
    exampleVietnamese: "Để bảo toàn thực lực, bộ đội quyết định rút lui.",
    context: "Rút quân hoặc lùi lại tránh giao tranh trực tiếp để chuẩn bị kế hoạch khác."
  },
  "战斗": {
    translation: "Chiến đấu",
    exampleChinese: "他们在一场激烈的战斗中获得了胜利。",
    examplePinyin: "Tāmen zài yī chǎng jīliè de zhàndòu zhōng huòdéle shènglì.",
    exampleVietnamese: "Họ đã giành chiến thắng trong một trận chiến đấu kịch liệt.",
    context: "Hoạt động giao tranh quân sự hoặc nỗ lực vượt qua khó khăn."
  },
  "策略": {
    translation: "Chiến lược / Sách lược",
    exampleChinese: "我们需要制定新的商业策略。",
    examplePinyin: "Wǒmen xūyào zhìdìng xīn de shāngyè cèlüè.",
    exampleVietnamese: "Chúng ta cần hoạch định chiến lược kinh doanh mới.",
    context: "Phương pháp hoặc kế hoạch dài hạn hướng tới đạt mục tiêu cụ thể."
  },
  "指挥": {
    translation: "Chỉ huy / Điều khiển",
    exampleChinese: "他在音乐会上指挥乐队演出。",
    examplePinyin: "Tā zài yīnyuèhuì shàng zhǐhuī yuèduì yǎnchū.",
    exampleVietnamese: "Anh ấy chỉ huy ban nhạc biểu diễn trong buổi hòa nhạc.",
    context: "Lãnh đạo, điều động người khác làm việc hoặc điều khiển nhạc kịch, giao thông."
  },
  "胜利": {
    translation: "Chiến thắng",
    exampleChinese: "坚持到底就是胜利。",
    examplePinyin: "Jiānchí dàodǐ jiùshì shènglì.",
    exampleVietnamese: "Kiên trì đến cùng chính là chiến thắng.",
    context: "Đạt được mục đích hoặc vượt qua đối thủ trong đấu tranh."
  },
  "防御": {
    translation: "Phòng thủ / Phòng ngự",
    exampleChinese: "修筑城墙是为了防御敌人的侵略。",
    examplePinyin: "Xiūzhù chéngqiáng shì wèile fángyù dírén de qīnlüè.",
    exampleVietnamese: "Xây dựng tường thành là để phòng ngự sự xâm lược của quân địch.",
    context: "Hành động chống đỡ, bảo vệ trước đòn tấn công của đối thủ."
  }
};



export function VocabularyPage() {
  const navigate = useNavigate();
  const { vocabList, removeWord, bulkAddCards, createFlashcardSet } = useVocabularyStore();
  const { addXp } = useAuthStore();

  const [showCreateDeckModal, setShowCreateDeckModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [deckSource, setDeckSource] = useState('Tổng hợp');
  const [deckDocumentId, setDeckDocumentId] = useState(null);
  const [isSavingDeck, setIsSavingDeck] = useState(false);

  const handleOpenCreateDeckModal = () => {
    const selectedWordsList = fullVocabularyDataset.filter(w => selectedRows.includes(w.text));
    if (selectedWordsList.length === 0) return;

    if (selectedWordsList.length < 10) {
      toast.warning('Bạn cần chọn ít nhất 10 từ vựng để tạo một bộ Flashcard.');
      return;
    }

    const firstWord = selectedWordsList[0];
    const allSameSource = selectedWordsList.every(w => w.source === firstWord.source && w.documentId === firstWord.documentId);
    
    let sourceStr = 'Tổng hợp';
    let docId = null;
    let defaultDeckName = 'Bộ học tập tự tạo';

    if (allSameSource && firstWord.documentId) {
      sourceStr = firstWord.source;
      docId = firstWord.documentId;
      const cleanDocTitle = firstWord.source.replace(/\.[^/.]+$/, "");
      defaultDeckName = `${cleanDocTitle} - Lesson ${new Date().toLocaleDateString('vi-VN')}`;
    } else {
      defaultDeckName = `Bộ từ vựng tổng hợp - ${new Date().toLocaleDateString('vi-VN')}`;
    }

    setNewDeckName(defaultDeckName);
    setDeckDescription('');
    setDeckSource(sourceStr);
    setDeckDocumentId(docId);
    setShowCreateDeckModal(true);
  };

  const handleCreateDeckSubmit = async (e) => {
    e.preventDefault();
    if (!newDeckName.trim()) {
      toast.warning('Vui lòng nhập tên bộ Flashcard.');
      return;
    }
    setIsSavingDeck(true);
    try {
      const selectedWordsList = fullVocabularyDataset
        .filter(w => selectedRows.includes(w.text))
        .map(w => w.text.split('_')[0]);

      await createFlashcardSet(
        newDeckName.trim(),
        deckDescription.trim() || null,
        deckDocumentId,
        selectedWordsList
      );

      toast.success('Đã tạo bộ Flashcard thành công!');
      setShowCreateDeckModal(false);
      setSelectedRows([]);
      navigate('/flashcards');
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi tạo bộ Flashcard.');
    } finally {
      setIsSavingDeck(false);
    }
  };

  const [documentsList, setDocumentsList] = useState([]);

  useEffect(() => {
    const fetchDocsList = async () => {
      try {
        const docs = await getMyDocuments();
        setDocumentsList(docs);
      } catch (error) {
        console.error(error);
      }
    };
    fetchDocsList();
  }, []);

  // Selected source filter tab at the top
  const [selectedSourceTab, setSelectedSourceTab] = useState('Tất cả');

  // Filter and search selectors
  const [sourceFilter, setSourceFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [learningFilter, setLearningFilter] = useState('');
  const [starredFilter, setStarredFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected rows (checkboxes)
  const [selectedRows, setSelectedRows] = useState([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Modal view word
  const [detailWord, setDetailWord] = useState(null);

  // Hovered word state
  const [hoveredWord, setHoveredWord] = useState(null);

  // Star state inside this UI (synchronizes with store where applicable)
  const [localStarred, setLocalStarred] = useState({});

  // Map user vocabulary to consistent structure
  const fullVocabularyDataset = useMemo(() => {
    return vocabList.map((w) => {
      const state = w.srsLevel >= 4 ? 'known' : w.srsLevel > 0 ? 'learning' : 'not_started';
      
      return {
        text: w.text,
        pinyin: w.pinyin || "pīnyīn",
        translation: w.translation || "nghĩa",
        source: w.documentTitle || "Chưa xác định",
        documentId: w.documentId,
        dateAdded: w.dateAdded || new Date().toISOString().split('T')[0],
        difficulty: w.difficulty || "medium",
        state: state,
        isUserWord: true
      };
    });
  }, [vocabList]);

  // Handle active filters & search queries
  const filteredVocabulary = useMemo(() => {
    return fullVocabularyDataset.filter(item => {
      // 1. Top Source Tab filter
      if (selectedSourceTab !== 'Tất cả' && item.source !== selectedSourceTab) {
        return false;
      }
      // 2. Select Source filter dropdown
      if (sourceFilter && item.source !== sourceFilter) {
        return false;
      }
      // 3. Difficulty dropdown filter
      if (difficultyFilter && item.difficulty !== difficultyFilter) {
        return false;
      }
      // 4. Learning state dropdown filter
      if (learningFilter) {
        if (learningFilter === 'known' && item.state !== 'known') return false;
        if (learningFilter === 'learning' && item.state !== 'learning') return false;
        if (learningFilter === 'not_started' && item.state !== 'not_started') return false;
        if (learningFilter === 'unreviewed' && item.state !== 'unreviewed') return false;
      }
      // 5. Star bookmark filter
      const isStarred = localStarred[item.text] || (vocabList.find(v => v.text === item.text)?.starred);
      if (starredFilter && !isStarred) {
        return false;
      }
      // 6. Search Bar query
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        // Extract raw text without index suffix for search match
        const cleanText = item.text.split('_')[0];
        return (
          cleanText.includes(query) ||
          item.pinyin.toLowerCase().includes(query) ||
          item.translation.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [fullVocabularyDataset, selectedSourceTab, sourceFilter, difficultyFilter, learningFilter, starredFilter, searchQuery, localStarred, vocabList]);

  // Pagination computing
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredVocabulary.slice(startIndex, startIndex + pageSize);
  }, [filteredVocabulary, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredVocabulary.length / pageSize) || 1;

  // Generate dynamic page numbers range for pagination controls
  const pageNumbers = useMemo(() => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  }, [currentPage, totalPages]);

  // Sync current page bounds when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRows([]);
  }, [selectedSourceTab, sourceFilter, difficultyFilter, learningFilter, starredFilter, searchQuery, pageSize]);

  // Audio Playback
  const speakWord = (e, text) => {
    e.stopPropagation();
    const cleanWord = text.split('_')[0];
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(cleanWord);
      utterance.lang = 'zh-CN';
      window.speechSynthesis.speak(utterance);
      addXp(1);
    }
  };

  // Toggle Star
  const toggleStar = (wordText) => {
    setLocalStarred(prev => ({
      ...prev,
      [wordText]: !prev[wordText]
    }));
  };

  // Checkbox multi-select helpers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(paginatedData.map(row => row.text));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (wordText) => {
    setSelectedRows(prev => {
      if (prev.includes(wordText)) {
        return prev.filter(t => t !== wordText);
      } else {
        return [...prev, wordText];
      }
    });
  };

  // Format dynamic HSK details safely for modal popup
  const getWordDetails = (wordText) => {
    const cleanText = wordText.split('_')[0];
    if (WORD_DETAILS_DB[cleanText]) {
      return WORD_DETAILS_DB[cleanText];
    }
    // Fallback template
    return {
      translation: "Chưa cập nhật chi tiết ngữ cảnh.",
      exampleChinese: `我们一起用“${cleanText}”写句子吧。`,
      examplePinyin: `Wǒmen yīqǐ yòng "${cleanText}" xiě jùzi ba.`,
      exampleVietnamese: `Chúng ta hãy cùng viết câu với từ "${cleanText}" nhé.`,
      context: `Từ vựng "${cleanText}" được sử dụng phổ biến trong cuộc sống và học tập.`
    };
  };

  // Color mappings for document badges matching mockup
  const getSourceBadgeStyle = (src) => {
    switch (src) {
      case 'SGK HSK 5 (1)':
        return 'bg-pink-50 text-pink-700 border-pink-100';
      case 'SBT HSK 5 (2)':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Sách logistic':
        return 'bg-teal-50 text-teal-700 border-teal-100';
      case 'Đề Hanban':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Sách khởi nghiệp':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const learningStats = useMemo(() => {
    const total = fullVocabularyDataset.length || 0;
    const known = fullVocabularyDataset.filter(w => w.state === 'known').length;
    const learning = fullVocabularyDataset.filter(w => w.state === 'learning').length;
    const notStarted = fullVocabularyDataset.filter(w => w.state === 'not_started').length;
    const unreviewed = fullVocabularyDataset.filter(w => w.state === 'unreviewed').length;
    
    const circum = 2 * Math.PI * 38;
    const safeTotal = total || 1;
    
    const knownDash = (known / safeTotal) * circum;
    const learningDash = (learning / safeTotal) * circum;
    const notStartedDash = (notStarted / safeTotal) * circum;
    const unreviewedDash = (unreviewed / safeTotal) * circum;
    
    return {
      total, known, learning, notStarted, unreviewed,
      circum, knownDash, learningDash, notStartedDash, unreviewedDash,
      learningOffset: -knownDash,
      notStartedOffset: -(knownDash + learningDash),
      unreviewedOffset: -(knownDash + learningDash + notStartedDash)
    };
  }, [fullVocabularyDataset]);

  return (
    <div className="space-y-6 page-transition py-4 text-slate-700 font-sans">
      


      {/* Main Two-Column Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Left Area: Vocabulary Table & Filters */}
        <div className="lg:col-span-3 space-y-5">
          
          {/* Filters Row Component */}
          {/* Filters Row Component */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between font-sans">
            
            {/* Left: Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Nguồn tài liệu */}
              <div className="relative">
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 hover:border-slate-350 text-xs font-bold text-slate-600 pl-3.5 pr-8 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer min-w-[160px]"
                >
                  <option value="">Nguồn tài liệu</option>
                  {documentsList.map(doc => (
                    <option key={doc.id} value={doc.title}>{doc.title}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Đã học */}
              <div className="relative">
                <select
                  value={learningFilter}
                  onChange={(e) => setLearningFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 hover:border-slate-350 text-xs font-bold text-slate-600 pl-3.5 pr-8 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer min-w-[150px]"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="known">Đã biết ({learningStats.known})</option>
                  <option value="learning">Đang học ({learningStats.learning})</option>
                  <option value="not_started">Chưa học ({learningStats.notStarted})</option>
                  <option value="unreviewed">Chưa ôn tập ({learningStats.unreviewed})</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Yêu thích (Starred) Toggle Button */}
              <button
                onClick={() => setStarredFilter(!starredFilter)}
                className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-bold transition-all shadow-sm ${
                  starredFilter
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${starredFilter ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                <span>Yêu thích</span>
              </button>
            </div>

            {/* Right: Search Input and Actions */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-grow lg:w-64">
                <input
                  type="text"
                  placeholder="Tìm từ vựng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-slate-400"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              {/* Reset filter button */}
              {(sourceFilter || learningFilter || starredFilter || searchQuery) && (
                <button
                  onClick={() => {
                    setSourceFilter('');
                    setLearningFilter('');
                    setStarredFilter(false);
                    setSearchQuery('');
                  }}
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-100 flex items-center justify-center transition-colors shrink-0"
                  title="Xóa bộ lọc"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors shadow-sm shrink-0">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Total Row Count Indicator */}
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 px-1 font-sans">
            <span>Tổng số: <span className="text-slate-800 font-extrabold">{filteredVocabulary.length}</span> từ vựng</span>
            {selectedRows.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-bold bg-blue-50/70 border border-blue-100 px-2.5 py-1 rounded-lg">
                  Đang chọn: {selectedRows.length} từ
                </span>
                <button
                  onClick={() => {
                    const selectedWordObjects = fullVocabularyDataset
                      .filter(w => selectedRows.includes(w.text))
                      .map(w => ({
                        text: w.text,
                        pinyin: w.pinyin,
                        translation: w.translation,
                        hsk: w.hsk,
                        dateAdded: w.dateAdded,
                        difficulty: w.difficulty,
                        srsLevel: w.srsLevel,
                        nextReviewDate: w.nextReviewDate
                      }));
                    navigate('/flashcards', { state: { selectedWords: selectedWordObjects, focusNewLearning: true } });
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1 border border-transparent cursor-pointer"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Ôn tập ngay</span>
                </button>
                <button
                  onClick={handleOpenCreateDeckModal}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1 border border-transparent cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo Flashcard</span>
                </button>
              </div>
            )}
          </div>

          {/* MAIN VOCABULARY DATATABLE */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm font-sans">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-4.5 px-4 w-12 text-center select-none">
                      <input 
                        type="checkbox"
                        checked={paginatedData.length > 0 && paginatedData.every(row => selectedRows.includes(row.text))}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer w-4 h-4 shadow-sm"
                      />
                    </th>
                    <th className="py-4.5 px-4 font-black w-[20%]">Từ vựng</th>
                    <th className="py-4.5 px-4 font-black w-[18%]">Pinyin</th>
                    <th className="py-4.5 px-4 font-black w-[25%]">Nghĩa</th>
                    <th className="py-4.5 px-4 font-black w-[18%]">Nguồn tài liệu</th>
                    <th className="py-4.5 px-4 font-black w-[13%]">Ngày học</th>
                    <th className="py-4.5 px-4 font-black text-center w-[12%]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.length > 0 ? (
                    paginatedData.map((row) => {
                      const isRowSelected = selectedRows.includes(row.text);
                      const isStarred = localStarred[row.text] || (vocabList.find(v => v.text === row.text)?.starred);
                      const cleanWordText = row.text.split('_')[0]; // Extract display word

                      return (
                        <tr 
                          key={row.id || row.text}
                          onMouseEnter={() => setHoveredWord(cleanWordText)}
                          onMouseLeave={() => setHoveredWord(null)}
                          className={`group hover:bg-blue-50 border-b border-slate-100 transition-colors duration-150 cursor-default ${
                            isRowSelected ? 'bg-blue-50/20' : ''
                          }`}
                        >
                          <td className="py-4 px-4 text-center select-none">
                            <input 
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => handleSelectRow(row.text)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer w-4 h-4"
                            />
                          </td>
                          <td className="py-4 px-4 font-display font-extrabold text-base text-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="group-hover:text-blue-600 transition-colors" title={`Từ vựng: ${cleanWordText}`}>{cleanWordText}</span>
                              <button 
                                onClick={(e) => speakWord(e, row.text)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-inner border border-slate-100"
                                title="Nghe phát âm"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-sans font-bold text-xs text-slate-450 tracking-wider">
                            {row.pinyin}
                          </td>
                          <td className="py-4 px-4 font-sans font-semibold text-xs text-slate-600">
                            {(() => {
                              try {
                                const parsed = JSON.parse(row.translation);
                                if (Array.isArray(parsed)) {
                                  const vnDef = parsed.find(d => d.lang === 'vn' || d.lang === 'vi');
                                  if (vnDef && vnDef.meaning) return vnDef.meaning;
                                  if (parsed.length > 0 && parsed[0].meaning) return parsed[0].meaning;
                                }
                                if (parsed && typeof parsed === 'object' && parsed.meaning) {
                                  return parsed.meaning;
                                }
                                return String(row.translation);
                              } catch (e) {
                                return row.translation;
                              }
                            })()}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex px-2.5 py-1 text-[10px] font-black rounded-lg border uppercase tracking-wider ${getSourceBadgeStyle(row.source)}`}>
                              {row.source}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-sans font-bold text-[11px] text-slate-450">
                            {row.dateAdded}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Star icon */}
                              <button 
                                onClick={() => toggleStar(row.text)}
                                className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 transition-colors"
                                title="Yêu thích"
                              >
                                <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                              </button>

                              {/* Details file icon */}
                              <button 
                                onClick={() => setDetailWord(row)}
                                className="p-1.5 text-slate-400 hover:text-blue-650 rounded-lg hover:bg-slate-100 transition-colors"
                                title="Xem chi tiết"
                              >
                                <FileText className="w-4 h-4" />
                              </button>

                              {/* More action menu */}
                              <button 
                                className="p-1.5 text-slate-400 hover:text-slate-650 rounded-lg hover:bg-slate-100 transition-colors"
                                title="Thao tác khác"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 text-xs font-semibold">
                        Không tìm thấy từ vựng nào khớp với bộ lọc của bạn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {filteredVocabulary.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-4 border border-slate-200/80 rounded-2xl p-4 bg-white shadow-sm font-sans">
              
              {/* Left spacer for centering the middle column */}
              <div className="hidden sm:block"></div>
              
              {/* Pagination arrows and indexes */}
              <div className="flex flex-col items-center justify-center gap-1.5 col-span-1">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                      currentPage === 1 
                        ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed shadow-none' 
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 active:scale-95 shadow-sm'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Dynamic page numbers helper */}
                  {pageNumbers.map((pNum, index) => {
                    if (pNum === '...') {
                      return (
                        <span key={`ellipsis-${index}`} className="w-9 h-9 flex items-center justify-center text-slate-400 text-xs font-bold select-none">
                          ...
                        </span>
                      );
                    }

                    const isActive = currentPage === pNum;
                    return (
                      <button
                        key={pNum}
                        onClick={() => setCurrentPage(pNum)}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-bold transition-all active:scale-95 ${
                          isActive
                            ? 'bg-blue-50 border-blue-500/30 text-blue-600 ring-2 ring-blue-500/10'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                      currentPage === totalPages 
                        ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed shadow-none' 
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 active:scale-95 shadow-sm'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">
                  Trang {currentPage} / {totalPages}
                </div>
              </div>

              {/* Items per page selector dropdown */}
              <div className="flex justify-center sm:justify-end">
                <div className="relative">
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="appearance-none bg-slate-50 border border-slate-200 hover:border-slate-350 text-xs font-bold text-slate-600 pl-3.5 pr-8 h-9 rounded-xl focus:outline-none transition-colors cursor-pointer shadow-sm"
                  >
                    <option value={10}>10 / trang</option>
                    <option value={20}>20 / trang</option>
                    <option value={50}>50 / trang</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar Area */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* 1. TỔNG QUAN CIRCULAR CHART CARD */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 font-sans">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-slate-800">Tổng quan</h3>
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-xs font-bold text-blue-650 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                <span>Xem chi tiết</span>
                <span>→</span>
              </button>
            </div>

            <div className="flex items-center gap-6">
              {/* Circular Gauge */}
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    className="stroke-slate-100 fill-transparent"
                    strokeWidth="8"
                  />
                  {/* Know segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    className="stroke-emerald-500 fill-transparent transition-all duration-500"
                    strokeWidth="8"
                    strokeDasharray={`${learningStats.knownDash} ${learningStats.circum - learningStats.knownDash}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                  {/* Learning segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    className="stroke-blue-500 fill-transparent transition-all duration-500"
                    strokeWidth="8"
                    strokeDasharray={`${learningStats.learningDash} ${learningStats.circum - learningStats.learningDash}`}
                    strokeDashoffset={learningStats.learningOffset}
                    strokeLinecap="round"
                  />
                  {/* Not started segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    className="stroke-purple-400 fill-transparent transition-all duration-500"
                    strokeWidth="8"
                    strokeDasharray={`${learningStats.notStartedDash} ${learningStats.circum - learningStats.notStartedDash}`}
                    strokeDashoffset={learningStats.notStartedOffset}
                    strokeLinecap="round"
                  />
                  {/* Unreviewed segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    className="stroke-amber-500 fill-transparent transition-all duration-500"
                    strokeWidth="8"
                    strokeDasharray={`${learningStats.unreviewedDash} ${learningStats.circum - learningStats.unreviewedDash}`}
                    strokeDashoffset={learningStats.unreviewedOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                  <span className="text-lg font-black text-slate-800 font-display">{learningStats.total}</span>
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tổng từ vựng</span>
                </div>
              </div>

              {/* Legend with exact stats matching mockup */}
              <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-2 text-[10px] font-semibold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="truncate">Đã biết: <span className="font-extrabold text-slate-800">{learningStats.known}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                  <span className="truncate">Đang học: <span className="font-extrabold text-slate-800">{learningStats.learning}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></span>
                  <span className="truncate">Chưa học: <span className="font-extrabold text-slate-800">{learningStats.notStarted}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                  <span className="truncate">Chưa ôn tập: <span className="font-extrabold text-slate-800">{learningStats.unreviewed}</span></span>
                </div>
              </div>
            </div>

            {/* Quick Study / Review action button */}
            <button
              onClick={() => navigate('/flashcards')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-transparent"
            >
              <GraduationCap className="w-4.5 h-4.5" />
              <span>Ôn tập ngay</span>
            </button>
          </div>

          {/* 2. TỪ VỰNG THEO NGUỒN TÀI LIỆU (PROGRESS BARS WIDGET) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4.5 font-sans">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Từ vựng theo nguồn tài liệu</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">Phân bố số lượng từ vựng đã lưu</p>
            </div>

            <div className="space-y-3.5">
              {(() => {
                const stats = {};
                fullVocabularyDataset.forEach(w => {
                  stats[w.source] = (stats[w.source] || 0) + 1;
                });
                
                const colors = ['bg-pink-500', 'bg-blue-500', 'bg-teal-500', 'bg-purple-500', 'bg-amber-500', 'bg-slate-450'];
                const totalVocab = fullVocabularyDataset.length || 1;
                
                return Object.keys(stats).map((sourceName, index) => ({
                  name: sourceName,
                  count: stats[sourceName],
                  total: totalVocab,
                  color: colors[index % colors.length]
                })).sort((a, b) => b.count - a.count);
              })().map((src) => {
                const percent = Math.min(Math.round((src.count / src.total) * 100), 100);
                
                return (
                  <div key={src.name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-600">{src.name}</span>
                      <span className="text-slate-800">{src.count}</span>
                    </div>
                    <div className="h-2 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${src.color} rounded-full`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. CÔNG CỤ HỌC TẬP (LINKS BOX) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4 font-sans">
            <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-100 pb-2">Công cụ học tập</h3>

            <div className="space-y-2 text-xs">
              {/* Flashcards */}
              <div 
                onClick={() => navigate('/flashcards')}
                className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-blue-200/50 hover:bg-slate-50 flex items-center justify-between cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors">Flashcards</h4>
                    <p className="text-[10px] text-slate-450 font-bold mt-0.5">Ôn tập bằng thẻ ghi nhớ</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>

              {/* Luyện nói */}
              <div 
                onClick={() => navigate('/pronunciation')}
                className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-blue-200/50 hover:bg-slate-50 flex items-center justify-between cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 group-hover:text-emerald-600 transition-colors">Luyện nói</h4>
                    <p className="text-[10px] text-slate-450 font-bold mt-0.5">Luyện phát âm từ vựng</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>

              {/* Ôn tập thông minh */}
              <div 
                onClick={() => navigate('/flashcards', { state: { startSrs: true } })}
                className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-blue-200/50 hover:bg-slate-50 flex items-center justify-between cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <BookMarked className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 group-hover:text-purple-600 transition-colors">Ôn tập thông minh</h4>
                    <p className="text-[10px] text-slate-450 font-bold mt-0.5">Hệ thống gợi ý ôn tập</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. HIGH-FIDELITY DETAILS MODAL VIEW */}
      {detailWord && (() => {
        const details = getWordDetails(detailWord.text);
        const cleanWord = detailWord.text.split('_')[0];
        const isStarred = localStarred[detailWord.text] || (vocabList.find(v => v.text === detailWord.text)?.starred);

        return (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-[2.2rem] p-7 md:p-8 max-w-xl w-full shadow-2xl relative space-y-6 animate-scale-in text-slate-700">
              
              {/* Close Button */}
              <button 
                onClick={() => setDetailWord(null)}
                className="text-slate-400 hover:text-slate-600 absolute top-5 right-5 p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
                title="Đóng chi tiết"
              >
                <X className="w-5 h-5" />
              </button>

              {/* HSK Badge & Top row */}
              <div className="flex justify-between items-center pr-8 border-b border-slate-100 pb-3">
                <span className="text-xs font-black px-3 py-1 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-100">
                  Nguồn: {detailWord.source}
                </span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => toggleStar(detailWord.text)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                    title="Đánh dấu từ"
                  >
                    <Star className={`w-5 h-5 ${isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                  </button>
                </div>
              </div>

              {/* Word Title & Pronunciation block */}
              <div className="flex items-center gap-4">
                <h3 className="text-4xl font-extrabold text-slate-800 font-display select-text">
                  {cleanWord}
                </h3>
                <span className="text-sm text-slate-400 font-bold tracking-wider">
                  [{detailWord.pinyin}]
                </span>
                <button
                  onClick={(e) => speakWord(e, detailWord.text)}
                  className="p-2 text-blue-600 hover:text-blue-500 bg-blue-50 hover:bg-blue-100/70 rounded-full transition-colors shadow-sm ml-auto"
                  title="Nghe phát âm"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {/* Translation box */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-500 font-black uppercase tracking-wider block">Nghĩa</span>
                <div className="bg-blue-50/20 border border-slate-150 rounded-2xl p-4 shadow-inner">
                  <p className="text-blue-650 font-black text-base select-text">
                    {(() => {
                      try {
                        const parsed = JSON.parse(detailWord.translation);
                        if (Array.isArray(parsed)) {
                          const vnDef = parsed.find(d => d.lang === 'vn' || d.lang === 'vi');
                          if (vnDef && vnDef.meaning) return vnDef.meaning;
                          if (parsed.length > 0 && parsed[0].meaning) return parsed[0].meaning;
                        }
                        if (parsed && typeof parsed === 'object' && parsed.meaning) {
                          return parsed.meaning;
                        }
                        return String(detailWord.translation);
                      } catch (e) {
                        return detailWord.translation;
                      }
                    })()}
                  </p>
                </div>
              </div>

              {/* Examples block */}
              <div className="space-y-1.5 select-text">
                <span className="text-xs text-slate-500 font-black uppercase tracking-wider block">Ví dụ</span>
                <div className="space-y-1 pl-1">
                  <p className="text-sm font-bold text-slate-800 leading-normal">{details.exampleChinese}</p>
                  <p className="text-xs text-slate-450 font-semibold">{details.examplePinyin}</p>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed">{details.exampleVietnamese}</p>
                </div>
              </div>

              {/* Usage context card */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-500 font-black uppercase tracking-wider block">Ngữ cảnh</span>
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex gap-3 shadow-inner">
                  <Lightbulb className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 font-medium leading-relaxed select-text">
                    {details.context}
                  </p>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Create Custom Flashcard Deck Modal */}
      {showCreateDeckModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col space-y-4 text-slate-700">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-800">Tạo bộ Flashcard mới</h3>
              <button 
                onClick={() => setShowCreateDeckModal(false)}
                className="text-slate-400 hover:text-slate-650 transition-colors font-bold text-sm"
              >
                Đóng
              </button>
            </div>
            
            <form onSubmit={handleCreateDeckSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Tên bộ Flashcard</label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Ví dụ: HSK4 Reading Lesson 19"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Mô tả (Không bắt buộc)</label>
                <input
                  type="text"
                  value={deckDescription}
                  onChange={(e) => setDeckDescription(e.target.value)}
                  placeholder="Nhập mô tả cho bộ thẻ này..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Nguồn tài liệu</label>
                <input
                  type="text"
                  value={deckSource}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500 cursor-not-allowed focus:outline-none"
                />
              </div>

              <div className="bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Số từ:</span>
                <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-extrabold">{selectedRows.length}</span>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateDeckModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingDeck}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                >
                  {isSavingDeck ? 'Đang tạo...' : 'Tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default VocabularyPage;
