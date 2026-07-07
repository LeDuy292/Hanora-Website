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
import { useToastStore } from '../store/toastStore';
import { getMyDocuments } from '../lib/api';
import { toast } from '../store/notificationStore';

// Static database of details for HSK words (consistent with Flashcard.jsx)
const WORD_DETAILS_DB = {
  "å­¦ä¹ ": {
    translation: "Há»c táº­p; nghiÃªn cá»©u",
    exampleChinese: "æˆ‘å–œæ¬¢å­¦ä¹ æ±‰è¯­ã€‚",
    examplePinyin: "WÇ’ xÇhuan xuÃ©xÃ­ HÃ nyÇ”.",
    exampleVietnamese: "TÃ´i thÃ­ch há»c tiáº¿ng Trung.",
    context: "Trong giao tiáº¿p, â€œå­¦ä¹ â€ thÆ°á»ng Ä‘i vá»›i cÃ¡c mÃ´n há»c hoáº·c ká»¹ nÄƒng cá»¥ thá»ƒ."
  },
  "å–œæ¬¢": {
    translation: "ThÃ­ch; Æ°a thÃ­ch",
    exampleChinese: "æˆ‘ä¸å–œæ¬¢å–èŒ¶ã€‚",
    examplePinyin: "WÇ’ bÃ¹ xÇhuan hÄ“ chÃ¡.",
    exampleVietnamese: "TÃ´i khÃ´ng thÃ­ch uá»‘ng trÃ .",
    context: "Biá»ƒu Ä‘áº¡t sá»Ÿ thÃ­ch cÃ¡ nhÃ¢n Ä‘á»‘i vá»›i ngÆ°á»i, Ä‘á»“ váº­t hoáº·c hÃ nh Ä‘á»™ng."
  },
  "å’–å•¡": {
    translation: "CÃ  phÃª",
    exampleChinese: "æˆ‘å–äº†ä¸€æ¯çƒ­å’–å•¡ã€‚",
    examplePinyin: "WÇ’ hÄ“le yÄ« bÄ“i rÃ¨ kÄfÄ“i.",
    exampleVietnamese: "TÃ´i Ä‘Ã£ uá»‘ng má»™t cá»‘c cÃ  phÃª nÃ³ng.",
    context: "Tá»« mÆ°á»£n phiÃªn Ã¢m tá»« tiáº¿ng Anh 'coffee' trong tiáº¿ng Trung."
  },
  "å°†å†›": {
    translation: "TÆ°á»›ng quÃ¢n",
    exampleChinese: "è¿™ä½å°†å†›åœ¨æˆ˜åœºä¸Šè¡¨çŽ°å¾—éžå¸¸å‹‡æ•¢ã€‚",
    examplePinyin: "ZhÃ¨ wÃ¨i jiÄngjÅ«n zÃ i zhÃ nchÇŽng shÃ ng biÇŽoxiÃ n de fÄ“ichÃ¡ng yÇ’nggÇŽn.",
    exampleVietnamese: "Vá»‹ tÆ°á»›ng quÃ¢n nÃ y Ä‘Ã£ thá»ƒ hiá»‡n ráº¥t dÅ©ng cáº£m trÃªn chiáº¿n trÆ°á»ng.",
    context: "Chá»‰ ngÆ°á»i chá»‰ huy quÃ¢n Ä‘á»™i, cÃ³ vai trÃ² quan trá»ng trong viá»‡c lÃ£nh Ä‘áº¡o chiáº¿n lÆ°á»£c."
  },
  "é‡è¦": {
    translation: "Quan trá»ng",
    exampleChinese: "è¿™ä»¶äº‹å¯¹ä»–éžå¸¸é‡è¦ã€‚",
    examplePinyin: "ZhÃ¨ jiÃ n shÃ¬ duÃ¬ wÇ’ fÄ“ichÃ¡ng zhÃ²ngyÃ o.",
    exampleVietnamese: "Viá»‡c nÃ y Ä‘á»‘i vá»›i tÃ´i vÃ´ cÃ¹ng quan trá»ng.",
    context: "TÃ­nh tá»« dÃ¹ng Ä‘á»ƒ nháº¥n máº¡nh tÃ­nh cháº¥t chá»§ chá»‘t, thiáº¿t yáº¿u cá»§a váº¥n Ä‘á»."
  },
  "å£«å…µ": {
    translation: "Binh lÃ­nh",
    exampleChinese: "å£«å…µä»¬æ­£åœ¨æŽ¥å—ä¸¥æ ¼çš„è®­ç»ƒã€‚",
    examplePinyin: "ShÃ¬bÄ«ngmen zhÃ¨ngzÃ i jiÄ“shÃ²u yÃ¡ngÃ© de xÃ¹nliÃ n.",
    exampleVietnamese: "CÃ¡c binh lÃ­nh Ä‘ang nháº­n Ä‘Æ°á»£c sá»± huáº¥n luyá»‡n nghiÃªm kháº¯c.",
    context: "Chá»‰ quÃ¢n lÃ­nh hoáº·c chiáº¿n sÄ© trong Ä‘Æ¡n vá»‹ quÃ¢n Ä‘á»™i."
  },
  "è¿›æ”»": {
    translation: "Tiáº¿n cÃ´ng",
    exampleChinese: "å†›é˜Ÿå‘æ•Œäººçš„é˜µåœ°å‘èµ·è¿›æ”»ã€‚",
    examplePinyin: "JÅ«nduÃ¬ xiÃ ng dÃ­rÃ©n de zhÃ¨ndÃ¬ fÄqÇ jÃ¬ngÅng.",
    exampleVietnamese: "QuÃ¢n Ä‘á»™i phÃ¡t Ä‘á»™ng tiáº¿n cÃ´ng vá» phÃ­a tráº­n Ä‘á»‹a cá»§a quÃ¢n Ä‘á»‹ch.",
    context: "HÃ nh Ä‘á»™ng táº¥n cÃ´ng chá»§ Ä‘á»™ng trong quÃ¢n sá»± hoáº·c cÃ¡c cuá»™c thi Ä‘áº¥u."
  },
  "æ’¤é€€": {
    translation: "RÃºt lui",
    exampleChinese: "ä¸ºäº†ä¿å­˜å®žåŠ›ï¼Œéƒ¨é˜Ÿå†³å®šæ’¤é€€ã€‚",
    examplePinyin: "WÃ¨ile bÇŽocÃºn shÃ­lÃ¬, bÃ¹duÃ¬ juÃ©dÃ¬ng chÃ¨tui.",
    exampleVietnamese: "Äá»ƒ báº£o toÃ n thá»±c lá»±c, bá»™ Ä‘á»™i quyáº¿t Ä‘á»‹nh rÃºt lui.",
    context: "RÃºt quÃ¢n hoáº·c lÃ¹i láº¡i trÃ¡nh giao tranh trá»±c tiáº¿p Ä‘á»ƒ chuáº©n bá»‹ káº¿ hoáº¡ch khÃ¡c."
  },
  "æˆ˜æ–—": {
    translation: "Chiáº¿n Ä‘áº¥u",
    exampleChinese: "ä»–ä»¬åœ¨ä¸€åœºæ¿€çƒˆçš„æˆ˜æ–—ä¸­èŽ·å¾—äº†èƒœåˆ©ã€‚",
    examplePinyin: "TÄmen zÃ i yÄ« chÇŽng jÄ«liÃ¨ de zhÃ ndÃ²u zhÅng huÃ²dÃ©le shÃ¨nglÃ¬.",
    exampleVietnamese: "Há» Ä‘Ã£ giÃ nh chiáº¿n tháº¯ng trong má»™t tráº­n chiáº¿n Ä‘áº¥u ká»‹ch liá»‡t.",
    context: "Hoáº¡t Ä‘á»™ng giao tranh quÃ¢n sá»± hoáº·c ná»— lá»±c vÆ°á»£t qua khÃ³ khÄƒn."
  },
  "ç­–ç•¥": {
    translation: "Chiáº¿n lÆ°á»£c / SÃ¡ch lÆ°á»£c",
    exampleChinese: "æˆ‘ä»¬éœ€è¦åˆ¶å®šæ–°çš„å•†ä¸šç­–ç•¥ã€‚",
    examplePinyin: "WÇ’men xÅ«yÃ o zhÃ¬dÃ¬ng xÄ«n de shÄngyÃ¨ cÃ¨lÃ¼Ã¨.",
    exampleVietnamese: "ChÃºng ta cáº§n hoáº¡ch Ä‘á»‹nh chiáº¿n lÆ°á»£c kinh doanh má»›i.",
    context: "PhÆ°Æ¡ng phÃ¡p hoáº·c káº¿ hoáº¡ch dÃ i háº¡n hÆ°á»›ng tá»›i Ä‘áº¡t má»¥c tiÃªu cá»¥ thá»ƒ."
  },
  "æŒ‡æŒ¥": {
    translation: "Chá»‰ huy / Äiá»u khiá»ƒn",
    exampleChinese: "ä»–åœ¨éŸ³ä¹ä¼šä¸ŠæŒ‡æŒ¥ä¹é˜Ÿæ¼”å‡ºã€‚",
    examplePinyin: "TÄ zÃ i yÄ«nyuÃ¨huÃ¬ shÃ ng zhÇhuÄ« yuÃ¨duÃ¬ yÇŽnchÅ«.",
    exampleVietnamese: "Anh áº¥y chá»‰ huy ban nháº¡c biá»ƒu diá»…n trong buá»•i hÃ²a nháº¡c.",
    context: "LÃ£nh Ä‘áº¡o, Ä‘iá»u Ä‘á»™ng ngÆ°á»i khÃ¡c lÃ m viá»‡c hoáº·c Ä‘iá»u khiá»ƒn nháº¡c ká»‹ch, giao thÃ´ng."
  },
  "èƒœåˆ©": {
    translation: "Chiáº¿n tháº¯ng",
    exampleChinese: "åšæŒåˆ°åº•å°±æ˜¯èƒœåˆ©ã€‚",
    examplePinyin: "JiÄnchÃ­ dÃ odÇ jiÃ¹shÃ¬ shÃ¨nglÃ¬.",
    exampleVietnamese: "KiÃªn trÃ¬ Ä‘áº¿n cÃ¹ng chÃ­nh lÃ  chiáº¿n tháº¯ng.",
    context: "Äáº¡t Ä‘Æ°á»£c má»¥c Ä‘Ã­ch hoáº·c vÆ°á»£t qua Ä‘á»‘i thá»§ trong Ä‘áº¥u tranh."
  },
  "é˜²å¾¡": {
    translation: "PhÃ²ng thá»§ / PhÃ²ng ngá»±",
    exampleChinese: "ä¿®ç­‘åŸŽå¢™æ˜¯ä¸ºäº†é˜²å¾¡æ•Œäººçš„ä¾µç•¥ã€‚",
    examplePinyin: "XiÅ«zhÃ¹ chÃ©ngqiÃ¡ng shÃ¬ wÃ¨ile fÃ¡ngyÃ¹ dÃ­rÃ©n de qÄ«nlÃ¼Ã¨.",
    exampleVietnamese: "XÃ¢y dá»±ng tÆ°á»ng thÃ nh lÃ  Ä‘á»ƒ phÃ²ng ngá»± sá»± xÃ¢m lÆ°á»£c cá»§a quÃ¢n Ä‘á»‹ch.",
    context: "HÃ nh Ä‘á»™ng chá»‘ng Ä‘á»¡, báº£o vá»‡ trÆ°á»›c Ä‘Ã²n táº¥n cÃ´ng cá»§a Ä‘á»‘i thá»§."
  }
};



export function VocabularyPage() {
  const navigate = useNavigate();
  const { vocabList, removeWord, bulkAddCards, createFlashcardSet } = useVocabularyStore();
  const { addXp } = useAuthStore();

  const [showCreateDeckModal, setShowCreateDeckModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [deckSource, setDeckSource] = useState('Tá»•ng há»£p');
  const [deckDocumentId, setDeckDocumentId] = useState(null);
  const [isSavingDeck, setIsSavingDeck] = useState(false);

  const handleOpenCreateDeckModal = () => {
    const selectedWordsList = fullVocabularyDataset.filter(w => selectedRows.includes(w.text));
    if (selectedWordsList.length === 0) return;

    const firstWord = selectedWordsList[0];
    const allSameSource = selectedWordsList.every(w => w.source === firstWord.source && w.documentId === firstWord.documentId);
    
    let sourceStr = 'Tá»•ng há»£p';
    let docId = null;
    let defaultDeckName;

    if (allSameSource && firstWord.documentId) {
      sourceStr = firstWord.source;
      docId = firstWord.documentId;
      const cleanDocTitle = firstWord.source.replace(/\.[^/.]+$/, "");
      defaultDeckName = `${cleanDocTitle} - Lesson ${new Date().toLocaleDateString('vi-VN')}`;
    } else {
      defaultDeckName = `Bá»™ tá»« vá»±ng tá»•ng há»£p - ${new Date().toLocaleDateString('vi-VN')}`;
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
      useToastStore.getState().addToast('Vui lÃ²ng nháº­p tÃªn bá»™ Flashcard.', 'error');
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

      useToastStore.getState().addToast('ÄÃ£ táº¡o bá»™ Flashcard thÃ nh cÃ´ng!', 'success');
      setShowCreateDeckModal(false);
      setSelectedRows([]);
      navigate('/flashcards');
    } catch (err) {
      console.error(err);
      useToastStore.getState().addToast('CÃ³ lá»—i xáº£y ra khi táº¡o bá»™ Flashcard.', 'error');
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
  const [selectedSourceTab, setSelectedSourceTab] = useState('Táº¥t cáº£');

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
        pinyin: w.pinyin || "pÄ«nyÄ«n",
        translation: w.translation || "nghÄ©a",
        source: w.documentTitle || "ChÆ°a xÃ¡c Ä‘á»‹nh",
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
      if (selectedSourceTab !== 'Táº¥t cáº£' && item.source !== selectedSourceTab) {
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
      translation: "ChÆ°a cáº­p nháº­t chi tiáº¿t ngá»¯ cáº£nh.",
      exampleChinese: `æˆ‘ä»¬ä¸€èµ·ç”¨â€œ${cleanText}â€å†™å¥å­å§ã€‚`,
      examplePinyin: `WÇ’men yÄ«qÇ yÃ²ng "${cleanText}" xiÄ› jÃ¹zi ba.`,
      exampleVietnamese: `ChÃºng ta hÃ£y cÃ¹ng viáº¿t cÃ¢u vá»›i tá»« "${cleanText}" nhÃ©.`,
      context: `Tá»« vá»±ng "${cleanText}" Ä‘Æ°á»£c sá»­ dá»¥ng phá»• biáº¿n trong cuá»™c sá»‘ng vÃ  há»c táº­p.`
    };
  };

  // Color mappings for document badges matching mockup
  const getSourceBadgeStyle = (src) => {
    switch (src) {
      case 'SGK HSK 5 (1)':
        return 'bg-pink-50 text-pink-700 border-pink-100';
      case 'SBT HSK 5 (2)':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'SÃ¡ch logistic':
        return 'bg-teal-50 text-teal-700 border-teal-100';
      case 'Äá» Hanban':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'SÃ¡ch khá»Ÿi nghiá»‡p':
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
              {/* Nguá»“n tÃ i liá»‡u */}
              <div className="relative">
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 hover:border-slate-350 text-xs font-bold text-slate-600 pl-3.5 pr-8 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer min-w-[160px]"
                >
                  <option value="">Nguá»“n tÃ i liá»‡u</option>
                  {documentsList.map(doc => (
                    <option key={doc.id} value={doc.title}>{doc.title}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* ÄÃ£ há»c */}
              <div className="relative">
                <select
                  value={learningFilter}
                  onChange={(e) => setLearningFilter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 hover:border-slate-350 text-xs font-bold text-slate-600 pl-3.5 pr-8 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer min-w-[150px]"
                >
                  <option value="">Táº¥t cáº£ tráº¡ng thÃ¡i</option>
                  <option value="known">ÄÃ£ biáº¿t ({learningStats.known})</option>
                  <option value="learning">Äang há»c ({learningStats.learning})</option>
                  <option value="not_started">ChÆ°a há»c ({learningStats.notStarted})</option>
                  <option value="unreviewed">ChÆ°a Ã´n táº­p ({learningStats.unreviewed})</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* YÃªu thÃ­ch (Starred) Toggle Button */}
              <button
                onClick={() => setStarredFilter(!starredFilter)}
                className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-bold transition-all shadow-sm ${
                  starredFilter
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${starredFilter ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                <span>YÃªu thÃ­ch</span>
              </button>
            </div>

            {/* Right: Search Input and Actions */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-grow lg:w-64">
                <input
                  type="text"
                  placeholder="TÃ¬m tá»« vá»±ng..."
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
                  title="XÃ³a bá»™ lá»c"
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
            <span>Tá»•ng sá»‘: <span className="text-slate-800 font-extrabold">{filteredVocabulary.length}</span> tá»« vá»±ng</span>
            {selectedRows.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-bold bg-blue-50/70 border border-blue-100 px-2.5 py-1 rounded-lg">
                  Äang chá»n: {selectedRows.length} tá»«
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
                  <span>Ã”n táº­p ngay</span>
                </button>
                <button
                  onClick={handleOpenCreateDeckModal}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1 border border-transparent cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Táº¡o Flashcard</span>
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
                    <th className="py-4.5 px-4 font-black w-[20%]">Tá»« vá»±ng</th>
                    <th className="py-4.5 px-4 font-black w-[18%]">Pinyin</th>
                    <th className="py-4.5 px-4 font-black w-[25%]">NghÄ©a</th>
                    <th className="py-4.5 px-4 font-black w-[18%]">Nguá»“n tÃ i liá»‡u</th>
                    <th className="py-4.5 px-4 font-black w-[13%]">NgÃ y há»c</th>
                    <th className="py-4.5 px-4 font-black text-center w-[12%]">Thao tÃ¡c</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.length > 0 ? (
                    paginatedData.map((row, index) => {
                      const isRowSelected = selectedRows.includes(row.text);
                      const isStarred = localStarred[row.text] || (vocabList.find(v => v.text === row.text)?.starred);
                      const cleanWordText = row.text.split('_')[0]; // Extract display word

                      return (
                        <tr 
                          key={row.id ?? `${row.text}-${currentPage}-${index}`}
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
                              <span className="group-hover:text-blue-600 transition-colors" title={`Tá»« vá»±ng: ${cleanWordText}`}>{cleanWordText}</span>
                              <button 
                                onClick={(e) => speakWord(e, row.text)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-inner border border-slate-100"
                                title="Nghe phÃ¡t Ã¢m"
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
                                title="YÃªu thÃ­ch"
                              >
                                <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                              </button>

                              {/* Details file icon */}
                              <button 
                                onClick={() => setDetailWord(row)}
                                className="p-1.5 text-slate-400 hover:text-blue-650 rounded-lg hover:bg-slate-100 transition-colors"
                                title="Xem chi tiáº¿t"
                              >
                                <FileText className="w-4 h-4" />
                              </button>

                              {/* More action menu */}
                              <button 
                                className="p-1.5 text-slate-400 hover:text-slate-650 rounded-lg hover:bg-slate-100 transition-colors"
                                title="Thao tÃ¡c khÃ¡c"
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
                        KhÃ´ng tÃ¬m tháº¥y tá»« vá»±ng nÃ o khá»›p vá»›i bá»™ lá»c cá»§a báº¡n.
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
          
          {/* 1. Tá»”NG QUAN CIRCULAR CHART CARD */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 font-sans">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-slate-800">Tá»•ng quan</h3>
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-xs font-bold text-blue-650 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                <span>Xem chi tiáº¿t</span>
                <span>â†’</span>
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
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tá»•ng tá»« vá»±ng</span>
                </div>
              </div>

              {/* Legend with exact stats matching mockup */}
              <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-2 text-[10px] font-semibold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="truncate">ÄÃ£ biáº¿t: <span className="font-extrabold text-slate-800">{learningStats.known}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                  <span className="truncate">Äang há»c: <span className="font-extrabold text-slate-800">{learningStats.learning}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></span>
                  <span className="truncate">ChÆ°a há»c: <span className="font-extrabold text-slate-800">{learningStats.notStarted}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                  <span className="truncate">ChÆ°a Ã´n táº­p: <span className="font-extrabold text-slate-800">{learningStats.unreviewed}</span></span>
                </div>
              </div>
            </div>

            {/* Quick Study / Review action button */}
            <button
              onClick={() => navigate('/flashcards')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-transparent"
            >
              <GraduationCap className="w-4.5 h-4.5" />
              <span>Ã”n táº­p ngay</span>
            </button>
          </div>

          {/* 2. Tá»ª Vá»°NG THEO NGUá»’N TÃ€I LIá»†U (PROGRESS BARS WIDGET) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4.5 font-sans">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Tá»« vá»±ng theo nguá»“n tÃ i liá»‡u</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">PhÃ¢n bá»‘ sá»‘ lÆ°á»£ng tá»« vá»±ng Ä‘Ã£ lÆ°u</p>
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

          {/* 3. CÃ”NG Cá»¤ Há»ŒC Táº¬P (LINKS BOX) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4 font-sans">
            <h3 className="text-sm font-extrabold text-slate-800 border-b border-slate-100 pb-2">CÃ´ng cá»¥ há»c táº­p</h3>

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
                    <p className="text-[10px] text-slate-450 font-bold mt-0.5">Ã”n táº­p báº±ng tháº» ghi nhá»›</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>

              {/* Luyá»‡n nÃ³i */}
              <div 
                onClick={() => navigate('/pronunciation')}
                className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-blue-200/50 hover:bg-slate-50 flex items-center justify-between cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 group-hover:text-emerald-600 transition-colors">Luyá»‡n nÃ³i</h4>
                    <p className="text-[10px] text-slate-450 font-bold mt-0.5">Luyá»‡n phÃ¡t Ã¢m tá»« vá»±ng</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>

              {/* Ã”n táº­p thÃ´ng minh */}
              <div 
                onClick={() => navigate('/flashcards', { state: { startSrs: true } })}
                className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-blue-200/50 hover:bg-slate-50 flex items-center justify-between cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <BookMarked className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 group-hover:text-purple-600 transition-colors">Ã”n táº­p thÃ´ng minh</h4>
                    <p className="text-[10px] text-slate-450 font-bold mt-0.5">Há»‡ thá»‘ng gá»£i Ã½ Ã´n táº­p</p>
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
                title="ÄÃ³ng chi tiáº¿t"
              >
                <X className="w-5 h-5" />
              </button>

              {/* HSK Badge & Top row */}
              <div className="flex justify-between items-center pr-8 border-b border-slate-100 pb-3">
                <span className="text-xs font-black px-3 py-1 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-100">
                  Nguá»“n: {detailWord.source}
                </span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => toggleStar(detailWord.text)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                    title="ÄÃ¡nh dáº¥u tá»«"
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
                  title="Nghe phÃ¡t Ã¢m"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              {/* Translation box */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-500 font-black uppercase tracking-wider block">NghÄ©a</span>
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
                <span className="text-xs text-slate-500 font-black uppercase tracking-wider block">VÃ­ dá»¥</span>
                <div className="space-y-1 pl-1">
                  <p className="text-sm font-bold text-slate-800 leading-normal">{details.exampleChinese}</p>
                  <p className="text-xs text-slate-450 font-semibold">{details.examplePinyin}</p>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed">{details.exampleVietnamese}</p>
                </div>
              </div>

              {/* Usage context card */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-500 font-black uppercase tracking-wider block">Ngá»¯ cáº£nh</span>
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
              <h3 className="text-base font-extrabold text-slate-800">Táº¡o bá»™ Flashcard má»›i</h3>
              <button 
                onClick={() => setShowCreateDeckModal(false)}
                className="text-slate-400 hover:text-slate-650 transition-colors font-bold text-sm"
              >
                ÄÃ³ng
              </button>
            </div>
            
            <form onSubmit={handleCreateDeckSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">TÃªn bá»™ Flashcard</label>
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="VÃ­ dá»¥: HSK4 Reading Lesson 19"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">MÃ´ táº£ (KhÃ´ng báº¯t buá»™c)</label>
                <input
                  type="text"
                  value={deckDescription}
                  onChange={(e) => setDeckDescription(e.target.value)}
                  placeholder="Nháº­p mÃ´ táº£ cho bá»™ tháº» nÃ y..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Nguá»“n tÃ i liá»‡u</label>
                <input
                  type="text"
                  value={deckSource}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500 cursor-not-allowed focus:outline-none"
                />
              </div>

              <div className="bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Sá»‘ tá»«:</span>
                <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-extrabold">{selectedRows.length}</span>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateDeckModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors"
                >
                  Há»§y
                </button>
                <button
                  type="submit"
                  disabled={isSavingDeck}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                >
                  {isSavingDeck ? 'Äang táº¡o...' : 'Táº¡o'}
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
