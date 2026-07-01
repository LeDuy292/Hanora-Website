import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getDocument, getVocabulary, getMyDocuments, getDocumentAnnotations,
  saveDocumentAnnotations, exportDocx, askAiAssistant, deleteDocument
} from '../lib/api';
import { toast } from '../store/notificationStore';
import WordCard from '../components/WordCard';
import UploadModal from '../components/UploadModal';
import { DocumentSelectModal } from '../components/DocumentSelectModal';
import { pinyin } from 'pinyin-pro';
import { useVocabularyStore } from '../store/vocabularyStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { apiRequest } from '../services/apiClient';
import {
  isStructureMarker, LINE_BREAK, PARAGRAPH_BREAK, joinDocumentSegments
} from '../utils/documentTextUtils';
import {
  MousePointer, Highlighter, Pencil, Eraser,
  FileText, Pin, Save, Download, X, Upload, ChevronLeft, ChevronRight,
  Maximize2, Minimize2, Palette, Type, BookOpen, MessageSquare,
  Activity, GraduationCap, Trophy, Flame, Play, Clock, Search, Send
} from 'lucide-react';

const HIGHLIGHT_COLORS = [
  { id: 'yellow', name: 'Vàng (Từ mới)', value: '#fef08a' },
  { id: 'green', name: 'Xanh lá (Đã hiểu)', value: '#bbf7d0' },
  { id: 'blue', name: 'Xanh dương (Quan trọng)', value: '#bfdbfe' },
  { id: 'purple', name: 'Tím (Ngữ pháp)', value: '#e9d5ff' },
  { id: 'pink', name: 'Hồng (Thành ngữ)', value: '#fbcfe8' },
  { id: 'red', name: 'Đỏ (Cần xem lại)', value: '#fecaca' }
];

const NOTE_CATEGORIES = [
  { id: 'text', name: 'Ghi chú văn bản', icon: '📝', prefix: '[Text] ' },
  { id: 'vocab', name: 'Ghi chú từ vựng', icon: '📖', prefix: '[Vocabulary] ' },
  { id: 'grammar', name: 'Ghi chú ngữ pháp', icon: '💡', prefix: '[Grammar] ' },
  { id: 'personal', name: 'Nhận xét cá nhân', icon: '👤', prefix: '[Personal] ' }
];

const saveNotePrefix = (text, category) => {
  const clean = text.replace(/^\[(Text|Vocabulary|Grammar|Personal)\]\s*/, '');
  if (category === 'vocab') return `[Vocabulary] ${clean}`;
  if (category === 'grammar') return `[Grammar] ${clean}`;
  if (category === 'personal') return `[Personal] ${clean}`;
  return `[Text] ${clean}`;
};

const parseNoteContent = (noteStr) => {
  if (!noteStr) return { text: '', category: 'text', icon: '📝', label: 'Ghi chú văn bản' };
  if (noteStr.startsWith('[Vocabulary] ')) {
    return { text: noteStr.slice('[Vocabulary] '.length), category: 'vocab', icon: '📖', label: 'Ghi chú từ vựng' };
  }
  if (noteStr.startsWith('[Grammar] ')) {
    return { text: noteStr.slice('[Grammar] '.length), category: 'grammar', icon: '💡', label: 'Ghi chú ngữ pháp' };
  }
  if (noteStr.startsWith('[Personal] ')) {
    return { text: noteStr.slice('[Personal] '.length), category: 'personal', icon: '👤', label: 'Nhận xét cá nhân' };
  }
  if (noteStr.startsWith('[Text] ')) {
    return { text: noteStr.slice('[Text] '.length), category: 'text', icon: '📝', label: 'Ghi chú văn bản' };
  }
  return { text: noteStr, category: 'text', icon: '📝', label: 'Ghi chú văn bản' };
};


const ReaderPage = () => {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [segments, setSegments] = useState([]);
  const WORDS_PER_PAGE = 500;
  const totalPages = Math.ceil(segments.length / WORDS_PER_PAGE) || 1;
  const [selectedWord, setSelectedWord] = useState(null);
  const [vocabData, setVocabData] = useState(null);
  const [isLoadingVocab, setIsLoadingVocab] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [showPinyin, setShowPinyin] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(!id);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [documentsList, setDocumentsList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const readerContainerRef = useRef(null);
  const navigate = useNavigate();

  // Settings
  const [fontMode, setFontMode] = useState('sans'); // sans, serif, kaiti
  const themeMode = 'light';
  const readMode = 'normal';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('dict'); // dict, chat, stats
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Document Dropdown list
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [isDocDropdownOpen, setIsDocDropdownOpen] = useState(false);
  const docDropdownRef = useRef(null);

  // Document-specific progress statistics
  const [readingSeconds, setReadingSeconds] = useState(0);
  const [lookupCount, setLookupCount] = useState(0);

  // Chatbot state for overall document chat
  const [docChatMessages, setDocChatMessages] = useState([]);
  const [docChatInput, setDocChatInput] = useState('');
  const [isSendingDocChat, setIsSendingDocChat] = useState(false);
  const docChatBottomRef = useRef(null);

  // store methods for quick bubble menu
  const { vocabList, addWord, updateServerStatus } = useVocabularyStore();
  const { user, trackStudyTime, refreshStats } = useAuthStore();

  // Annotations state
  const [annotations, setAnnotations] = useState({
    pencilStrokes: {},
    highlights: {},
    textNotes: {},
    stickyNotes: {}
  });

  // Editor states
  const [activeTool, setActiveTool] = useState('pointer'); // pointer, highlight, pencil, eraser, textNote, stickyNote
  const [activeColor, setActiveColor] = useState('#fef08a'); // yellow default
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [editingNote, setEditingNote] = useState(null); // { absIndex, type, text, category }
  const [hoveredNote, setHoveredNote] = useState(null); // { text, x, y }

  // Bubble menu state
  const [bubbleMenu, setBubbleMenu] = useState({
    visible: false,
    text: '',
    startIndex: -1,
    x: 0,
    y: 0
  });

  const canvasRef = useRef(null);

  useEffect(() => {
    if (!id) {
      setDocument(null);
      setSegments([]);
      setCurrentPage(1);
      setReadingSeconds(0);
      setLookupCount(0);
      return;
    }
    const fetchDoc = async () => {
      try {
        const doc = await getDocument(id);
        setDocument(doc);
        setCurrentPage(1);
        setReadingSeconds(0);
        setLookupCount(0);
        if (doc.extractedText) {
          try {
            const parsed = JSON.parse(doc.extractedText);
            // Normalize \r\n to \n so LINE_BREAK/PARAGRAPH_BREAK comparisons work
            const normalized = parsed.map(s =>
              typeof s === 'string' ? s.replace(/\r\n/g, '\n').replace(/\r/g, '\n') : s
            );
            setSegments(normalized);
          } catch (e) {
            console.warn("Extracted text is not valid JSON, preserving line breaks.", e);
            // Fallback: split by newline and words but preserve structure markers
            const raw = doc.extractedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            const fallbackSegs = [];
            raw.split('\n\n').forEach((para, pi) => {
              if (pi > 0) fallbackSegs.push('\n\n');
              para.split('\n').forEach((line, li) => {
                if (li > 0) fallbackSegs.push('\n');
                line.split(/\s+/).filter(Boolean).forEach(w => fallbackSegs.push(w));
              });
            });
            setSegments(fallbackSegs);
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchDoc();
  }, [id]);

  useEffect(() => {
    if (!id) {
      setAnnotations({
        pencilStrokes: {},
        highlights: {},
        textNotes: {},
        stickyNotes: {}
      });
      return;
    }
    const fetchAnnotations = async () => {
      try {
        const res = await getDocumentAnnotations(id);
        if (res && res.annotationsJson) {
          const parsed = JSON.parse(res.annotationsJson);
          setAnnotations({
            pencilStrokes: parsed.pencilStrokes || {},
            highlights: parsed.highlights || {},
            textNotes: parsed.textNotes || {},
            stickyNotes: parsed.stickyNotes || {}
          });
        } else {
          setAnnotations({
            pencilStrokes: {},
            highlights: {},
            textNotes: {},
            stickyNotes: {}
          });
        }
      } catch (error) {
        console.error("Error loading annotations:", error);
      }
    };
    fetchAnnotations();
  }, [id]);

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

  const handleDeleteDocument = async (docId, title) => {
    toast.confirm(
      `Bạn có chắc chắn muốn xóa tài liệu "${title}" không? Hành động này sẽ xóa tất cả ghi chú, vẽ vẽ, và các dữ liệu liên quan.`,
      async () => {
        try {
          await deleteDocument(docId);
          toast.success("Xóa tài liệu thành công!");
          // Refresh the documents list
          const docs = await getMyDocuments();
          setDocumentsList(docs);
        } catch (error) {
          console.error(error);
          toast.error(error.message || "Không thể xóa tài liệu.");
        }
      },
      "Xóa tài liệu"
    );
  };

  const currentPageRef = useRef(currentPage);
  const totalPagesRef = useRef(totalPages);
  const readingSecondsRef = useRef(readingSeconds);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  useEffect(() => {
    readingSecondsRef.current = readingSeconds;
  }, [readingSeconds]);

  const saveReadingProgress = async () => {
    if (!document?.id) return;
    const currPage = currentPageRef.current;
    const totPages = totalPagesRef.current;
    const sec = readingSecondsRef.current;
    try {
      await apiRequest(`/documents/${document.id}/progress`, {
        method: 'POST',
        body: {
          lastPage: currPage,
          progressPercent: Math.min(100, Math.round((currPage / totPages) * 100)),
          readingMinutes: Math.floor(sec / 60)
        },
        auth: true
      });
    } catch (err) {
      console.error("Error saving reading progress:", err);
    }
  };

  useEffect(() => {
    if (document) {
      saveReadingProgress();
    }
  }, [currentPage, document]);

  // Set up document study time active tracking
  useEffect(() => {
    if (!document) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      setReadingSeconds(prev => {
        const next = prev + 1;
        if (next > 0 && next % 60 === 0) {
          trackStudyTime(1).then(() => {
            refreshStats();
            saveReadingProgress();
          });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [document, trackStudyTime, refreshStats]);

  // General Document chat welcome messages
  useEffect(() => {
    if (document) {
      setDocChatMessages([
        {
          id: 'welcome-doc',
          sender: 'ai',
          text: `Chào bạn! Tôi là Trợ lý Học tập AI của Hanora. Bạn đang đọc tài liệu **"${document.title}"**.\nBạn cần tôi giải thích nội dung chung, tóm tắt đoạn văn hay hỗ trợ gì khác không?`
        }
      ]);
    }
  }, [document]);

  // Auto-scroll general document chat
  useEffect(() => {
    docChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [docChatMessages]);

  // Click outside to close document selector dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (docDropdownRef.current && !docDropdownRef.current.contains(e.target)) {
        setIsDocDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Listen to Fullscreen API changes to keep state correct
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!window.document.fullscreenElement);
    };
    window.document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => window.document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Redraw hand-drawn canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return;

    // Draw saved strokes for this page
    const pageStrokes = annotations.pencilStrokes[currentPage] || [];
    pageStrokes.forEach(stroke => {
      if (stroke.points.length < 1) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color || '#ef4444';
      ctx.lineWidth = stroke.width || 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * width, stroke.points[i].y * height);
      }
      ctx.stroke();
    });

    // Draw current stroke
    if (activeTool === 'pencil' && currentStroke.length >= 1) {
      ctx.beginPath();
      ctx.strokeStyle = activeColor || '#ef4444';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(currentStroke[0].x * width, currentStroke[0].y * height);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x * width, currentStroke[i].y * height);
      }
      ctx.stroke();
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [annotations.pencilStrokes, currentPage, currentStroke, activeTool]);

  useEffect(() => {
    const handleResize = () => {
      drawCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [annotations.pencilStrokes, currentPage, currentStroke, activeTool]);

  // Pointer events for Canvas Pencil / Eraser
  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xPercent = (e.clientX - rect.left) / rect.width;
    const yPercent = (e.clientY - rect.top) / rect.height;

    if (activeTool === 'pencil') {
      setIsDrawing(true);
      setCurrentStroke([{ x: xPercent, y: yPercent }]);
    } else if (activeTool === 'eraser') {
      setIsDrawing(true);
      eraseStrokesNear(xPercent, yPercent);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xPercent = (e.clientX - rect.left) / rect.width;
    const yPercent = (e.clientY - rect.top) / rect.height;

    if (activeTool === 'pencil') {
      setCurrentStroke(prev => [...prev, { x: xPercent, y: yPercent }]);
    } else if (activeTool === 'eraser') {
      eraseStrokesNear(xPercent, yPercent);
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (activeTool === 'pencil' && currentStroke.length > 0) {
      const stroke = {
        color: activeColor || '#ef4444',
        width: 3,
        points: currentStroke
      };
      setAnnotations(prev => {
        const pageStrokes = prev.pencilStrokes[currentPage] || [];
        const next = {
          ...prev,
          pencilStrokes: {
            ...prev.pencilStrokes,
            [currentPage]: [...pageStrokes, stroke]
          }
        };
        autoSaveAnnotations(next);
        return next;
      });
    }
    setCurrentStroke([]);
  };

  const eraseStrokesNear = (xPercent, yPercent) => {
    const pageStrokes = annotations.pencilStrokes[currentPage] || [];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;

    const clickX = xPercent * width;
    const clickY = yPercent * height;
    const pixelThreshold = 20;

    const updatedStrokes = pageStrokes.filter(stroke => {
      const isClose = stroke.points.some(p => {
        const px = p.x * width;
        const py = p.y * height;
        const dx = px - clickX;
        const dy = py - clickY;
        return Math.sqrt(dx * dx + dy * dy) < pixelThreshold;
      });
      return !isClose;
    });

    setAnnotations(prev => {
      const next = {
        ...prev,
        pencilStrokes: {
          ...prev.pencilStrokes,
          [currentPage]: updatedStrokes
        }
      };
      autoSaveAnnotations(next);
      return next;
    });
  };

  // Annotations saving & exporting
  const autoSaveAnnotations = async (nextAnnotations) => {
    if (!id) return;
    try {
      await saveDocumentAnnotations(id, JSON.stringify(nextAnnotations));
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  const handleSaveAnnotations = async () => {
    try {
      await saveDocumentAnnotations(id, JSON.stringify(annotations));
      useToastStore.getState().addToast("Đã lưu toàn bộ ghi chú và nét vẽ thành công!", "success");
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast("Lỗi khi lưu ghi chú.", "error");
    }
  };

  const handleExportDocx = async () => {
    if (!document) return;
    try {
      await exportDocx(id, document.title);
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast("Có lỗi xảy ra khi xuất file Word (.docx).", "error");
    }
  };

  const handleWordClick = async (word, relIndex, e) => {
    const selection = window.getSelection().toString().trim();
    if (selection.length > 0) return;

    const absIndex = (currentPage - 1) * WORDS_PER_PAGE + relIndex;

    // Highlight Tool Mode
    if (activeTool === 'highlight') {
      setAnnotations(prev => {
        const highlights = { ...prev.highlights };
        if (highlights[absIndex] === activeColor) {
          delete highlights[absIndex];
        } else {
          highlights[absIndex] = activeColor;
        }
        const next = { ...prev, highlights };
        autoSaveAnnotations(next);
        return next;
      });
      return;
    }

    // Text Note Tool Mode
    if (activeTool === 'textNote') {
      const noteVal = annotations.textNotes[absIndex] || '';
      startEditingNote(absIndex, 'text', noteVal);
      return;
    }

    // Sticky Note Tool Mode
    if (activeTool === 'stickyNote') {
      const noteVal = annotations.stickyNotes[absIndex] || '';
      startEditingNote(absIndex, 'sticky', noteVal);
      return;
    }

    // Default Pointer (Lookup)

    if (!word || word.trim() === '' || isStructureMarker(word)) return;

    setSelectedWord(word);
    setVocabData(null);
    setIsLoadingVocab(true);
    setLookupCount(prev => prev + 1);
    setSidebarTab('dict');

    if (!isSidebarOpen) {
      setIsSidebarOpen(true);
    }

    try {
      const data = await getVocabulary(word);
      setVocabData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingVocab(false);
    }
  };

  const startEditingNote = (absIndex, type, rawText) => {
    const parsed = parseNoteContent(rawText);
    setEditingNote({
      absIndex,
      type,
      text: parsed.text,
      category: parsed.category
    });
  };

  const handleTextSelection = async () => {
    if (activeTool === 'pencil' || activeTool === 'eraser') return;

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (!selectedText) {
      setBubbleMenu(prev => ({ ...prev, visible: false }));
      return;
    }

    if (/^[，。！？；：、（）[\]{}""''\s]+$/.test(selectedText)) return;

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const spans = readerContainerRef.current?.querySelectorAll('[data-abs-index]');
      if (!spans) return;

      let startIdx = -1;
      let endIdx = -1;

      spans.forEach(span => {
        if (selection.containsNode(span, true)) {
          const idx = Number(span.getAttribute('data-abs-index'));
          if (startIdx === -1) {
            startIdx = idx;
          }
          endIdx = idx;
        }
      });

      if (startIdx !== -1 && endIdx !== -1) {
        if (activeTool === 'highlight') {
          // Highlight selection immediately
          setAnnotations(prev => {
            const highlights = { ...prev.highlights };
            const min = Math.min(startIdx, endIdx);
            const max = Math.max(startIdx, endIdx);
            for (let i = min; i <= max; i++) {
              highlights[i] = activeColor;
            }
            const next = { ...prev, highlights };
            autoSaveAnnotations(next);
            return next;
          });
          selection.removeAllRanges();
        } else {
          // Normal selection -> show bubble context menu
          const rect = range.getBoundingClientRect();
          setBubbleMenu({
            visible: true,
            text: selectedText,
            startIndex: startIdx,
            x: rect.left + rect.width / 2,
            y: Math.max(10, rect.top - 50)
          });
        }
      }
    }
  };

  // Hover popover indicators
  const handleWordMouseEnter = (absIndex, e) => {
    const textNote = annotations.textNotes[absIndex];
    const stickyNote = annotations.stickyNotes[absIndex];
    if (textNote || stickyNote) {
      const rect = e.currentTarget.getBoundingClientRect();
      const parsedText = textNote ? parseNoteContent(textNote) : null;
      const parsedSticky = stickyNote ? parseNoteContent(stickyNote) : null;

      setHoveredNote({
        text: [
          parsedText ? `${parsedText.icon} ${parsedText.label}: ${parsedText.text}` : null,
          parsedSticky ? `📌 Note nổi: ${parsedSticky.text}` : null
        ].filter(Boolean).join('\n---\n'),
        x: rect.left + rect.width / 2,
        y: rect.top
      });
    }
  };

  const handleWordMouseLeave = () => {
    setHoveredNote(null);
  };

  // Bubble menu methods
  const handleBubbleSaveToNotebook = async () => {
    if (!bubbleMenu.text) return;
    try {
      const vocab = await getVocabulary(bubbleMenu.text);
      await addWord({
        text: vocab.word || bubbleMenu.text,
        pinyin: vocab.pinyin || '',
        translation: typeof vocab.definitions === 'string' ? vocab.definitions : JSON.stringify(vocab.definitions),
        documentId: id,
        documentTitle: document?.title
      });
      useToastStore.getState().addToast('Đã lưu vào sổ tay từ vựng thành công!', 'success');
    } catch (error) {
      console.error(error);
      try {
        await addWord({
          text: bubbleMenu.text,
          pinyin: '',
          translation: 'Từ vựng tự học',
          documentId: id,
          documentTitle: document?.title
        });
        useToastStore.getState().addToast('Đã lưu vào sổ tay thành công!', 'success');
      } catch (e2) {
        useToastStore.getState().addToast('Lỗi khi lưu vào sổ tay.', 'error');
      }
    } finally {
      setBubbleMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const handleBubbleSaveToFlashcard = async () => {
    if (!bubbleMenu.text) return;
    try {
      await updateServerStatus(bubbleMenu.text, "learning", 0);
      useToastStore.getState().addToast('Đã lưu vào danh sách Flashcard thành công!', 'success');
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast('Có lỗi xảy ra khi lưu Flashcard.', 'error');
    } finally {
      setBubbleMenu(prev => ({ ...prev, visible: false }));
    }
  };

  // General Document chat query submission
  const handleSendDocChat = async (e, textToSend) => {
    e?.preventDefault();
    const queryText = textToSend || docChatInput;
    if (!queryText.trim() || isSendingDocChat) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText.trim()
    };

    setDocChatMessages(prev => [...prev, userMessage]);
    if (!textToSend) setDocChatInput('');
    setIsSendingDocChat(true);

    try {
      const titleContext = document?.title || "Tài liệu tiếng Trung";
      const snippetContext = joinDocumentSegments(segments.slice(0, 30));
      const res = await askAiAssistant(titleContext, queryText.trim(), snippetContext);
      setDocChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.reply || res.Reply || "Tôi xin lỗi, không có câu trả lời nào từ AI."
      }]);
    } catch (err) {
      console.error(err);
      setDocChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: "Không thể kết nối với AI vào lúc này. Vui lòng thử lại sau."
      }]);
    } finally {
      setIsSendingDocChat(false);
    }
  };

  const closeWordCard = () => {
    setSelectedWord(null);
    setVocabData(null);
  };

  const toggleFullscreen = () => {
    if (!window.document.fullscreenElement) {
      window.document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error(err);
      });
    } else {
      window.document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };


  const validCurrentPage = Math.min(currentPage, totalPages);
  const currentSegments = segments.slice((validCurrentPage - 1) * WORDS_PER_PAGE, validCurrentPage * WORDS_PER_PAGE);

  // Document selectors filtered list
  const filteredDropdownDocs = documentsList.filter(d =>
    d.title.toLowerCase().includes(docSearchQuery.toLowerCase())
  );
  const recentDropdownDocs = documentsList.slice(0, 4);

  // Count saved words in current document
  const savedWordsInDoc = vocabList.filter(w => String(w.documentId) === String(id)).length;
  const totalDocChars = segments.reduce((sum, s) => sum + (isStructureMarker(s) ? 0 : s.length), 0);

  // Theme styling configurations
  const themeStyles = {
    light: {
      bg: 'bg-[#f8fafc]',
      text: 'text-slate-800',
      textMuted: 'text-slate-500',
      card: 'bg-white border-slate-100',
      sheet: 'bg-white border-slate-200 shadow-xl',
      border: 'border-slate-200',
      toolbar: 'bg-white border-b border-slate-200',
      input: 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-400 focus:ring-blue-400/20',
      activeTab: 'border-blue-600 text-blue-600 bg-blue-50/30'
    },
    dark: {
      bg: 'bg-slate-900',
      text: 'text-slate-200',
      textMuted: 'text-slate-400',
      card: 'bg-slate-950 border-slate-850',
      sheet: 'bg-slate-950 border-slate-800 shadow-2xl',
      border: 'border-slate-800',
      toolbar: 'bg-slate-900 border-b border-slate-800',
      input: 'bg-slate-900 border-slate-700 text-slate-100 focus:border-blue-500 focus:ring-blue-500/20',
      activeTab: 'border-blue-500 text-blue-400 bg-blue-950/20'
    },
    sepia: {
      bg: 'bg-[#fbf0db]',
      text: 'text-[#433422]',
      textMuted: 'text-[#846b4e]',
      card: 'bg-[#f5eccd] border-[#e6dcbf]',
      sheet: 'bg-[#f5eccd] border-[#e6dcbf] shadow-xl',
      border: 'border-[#e6dcbf]',
      toolbar: 'bg-[#ebdcb9] border-b border-[#dfcfab]',
      input: 'bg-[#f6ebd0] border-[#dccbaa] text-[#433422] focus:border-[#c59c5e] focus:ring-[#c59c5e]/20',
      activeTab: 'border-[#c59c5e] text-[#a47b3e] bg-[#ebdcb9]/40'
    }
  };

  const activeTheme = themeStyles[themeMode] || themeStyles.light;

  const fontStyles = {
    sans: 'font-sans',
    serif: 'font-serif',
    kaiti: 'font-kaiti'
  };


  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${activeTheme.bg} ${activeTheme.text}`}>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />

      <DocumentSelectModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
        documents={documentsList}
        currentId={id}
        onSelect={(newId) => {
          if (newId) navigate(`/reader/${newId}`);
          else navigate(`/reader`);
        }}
        onDelete={handleDeleteDocument}
      />

      {/* Bubble Context Menu */}
      {bubbleMenu.visible && (
        <div
          className="fixed z-[100] bg-gray-950/95 backdrop-blur-md text-white text-[11px] rounded-2xl p-1.5 shadow-2xl flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150 border border-gray-800"
          style={{
            left: `${bubbleMenu.x}px`,
            top: `${bubbleMenu.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <button
            onClick={handleBubbleSaveToFlashcard}
            className="px-2.5 py-1.5 hover:bg-white/10 rounded-xl transition-colors font-bold text-center"
          >
            + Flashcard
          </button>
          <div className="w-[1px] h-4 bg-white/20" />
          <button
            onClick={handleBubbleSaveToNotebook}
            className="px-2.5 py-1.5 hover:bg-white/10 rounded-xl transition-colors font-bold text-center"
          >
            + Sổ tay
          </button>
          <div className="w-[1px] h-4 bg-white/20" />
          <button
            onClick={() => {
              startEditingNote(bubbleMenu.startIndex, 'text', annotations.textNotes[bubbleMenu.startIndex]);
              setBubbleMenu(prev => ({ ...prev, visible: false }));
            }}
            className="px-3 py-1.5 hover:bg-white/10 rounded-xl transition-colors font-bold text-center flex items-center gap-1"
          >
            📝 Ghi chú
          </button>
          <div className="w-[1px] h-4 bg-white/20" />
          <button
            onClick={async () => {
              const word = bubbleMenu.text;
              setSelectedWord(word);
              setVocabData(null);
              setIsLoadingVocab(true);
              setLookupCount(prev => prev + 1);
              setSidebarTab('dict');
              setIsSidebarOpen(true);
              setBubbleMenu(prev => ({ ...prev, visible: false }));
              try {
                const data = await getVocabulary(word);
                setVocabData(data);
              } catch (error) {
                console.error(error);
              } finally {
                setIsLoadingVocab(false);
              }
            }}
            className="px-3 py-1.5 hover:bg-white/10 rounded-xl transition-colors font-bold text-center flex items-center gap-1"
          >
            🔍 Dịch nhanh
          </button>
          <div className="w-[1px] h-4 bg-white/20" />
          <button
            onClick={() => {
              navigator.clipboard.writeText(bubbleMenu.text);
              useToastStore.getState().addToast('Đã sao chép nội dung vào bộ nhớ tạm!', 'success');
              setBubbleMenu(prev => ({ ...prev, visible: false }));
            }}
            className="px-3 py-1.5 hover:bg-white/10 rounded-xl transition-colors font-bold text-center flex items-center gap-1"
          >
            📋 Sao chép
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-955" />
        </div>
      )}

      {/* Hover Notes Tooltip */}
      {hoveredNote && (

        <div
          className="fixed z-50 bg-gray-900 text-white text-[11px] rounded-xl p-3 shadow-2xl max-w-xs animate-in fade-in duration-100 border border-gray-800 pointer-events-none select-none font-sans"
          style={{
            left: `${hoveredNote.x}px`,
            top: `${hoveredNote.y - 8}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="whitespace-pre-line leading-relaxed font-medium">{hoveredNote.text}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900" />
        </div>
      )}

      {/* Note Editor Modal with 4 categories selection */}
      {editingNote && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[99] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 flex flex-col gap-4 text-gray-800">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                {editingNote.type === 'text' ? (
                  <><FileText className="w-5 h-5 text-blue-500" /><span>Thêm Ghi Chú Tài Liệu</span></>
                ) : (
                  <><Pin className="w-5 h-5 text-amber-500" /><span>Ghi chú nổi (Sticky Note)</span></>
                )}
              </h3>
              <button
                onClick={() => setEditingNote(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-500">Đoạn bôi đen: <span className="font-bold text-gray-800">"{segments[editingNote.absIndex]}"</span></p>

              {/* Category selector */}
              <div>
                <label className="text-[11px] font-black uppercase text-gray-400 tracking-wider block mb-2">Phân loại ghi chú</label>
                <div className="grid grid-cols-2 gap-2">
                  {NOTE_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setEditingNote(prev => ({ ...prev, category: cat.id }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${editingNote.category === cat.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                        }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-gray-400 tracking-wider block mb-2">Nội dung</label>
                <textarea
                  value={editingNote.text}
                  onChange={(e) => setEditingNote(prev => ({ ...prev, text: e.target.value }))}
                  className="w-full border border-gray-200 rounded-2xl p-4 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 min-h-[100px] font-sans resize-none leading-relaxed"
                  placeholder="Nhập ghi chú chi tiết học tập của bạn..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3 border-gray-100 mt-2">
              <button
                onClick={() => {
                  setAnnotations(prev => {
                    const notesKey = editingNote.type === 'text' ? 'textNotes' : 'stickyNotes';
                    const updatedNotes = { ...prev[notesKey] };
                    delete updatedNotes[editingNote.absIndex];
                    const next = { ...prev, [notesKey]: updatedNotes };
                    autoSaveAnnotations(next);
                    return next;
                  });
                  setEditingNote(null);
                }}
                className="px-4 py-2 hover:bg-red-50 text-red-650 text-xs font-bold rounded-xl transition-all"
              >
                Xóa
              </button>
              <button
                onClick={() => setEditingNote(null)}
                className="px-4 py-2 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-xl transition-all"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setAnnotations(prev => {
                    const notesKey = editingNote.type === 'text' ? 'textNotes' : 'stickyNotes';
                    const serializedNote = saveNotePrefix(editingNote.text, editingNote.category);
                    const next = {
                      ...prev,
                      [notesKey]: {
                        ...prev[notesKey],
                        [editingNote.absIndex]: serializedNote
                      }
                    };
                    autoSaveAnnotations(next);
                    return next;
                  });
                  setEditingNote(null);
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-blue-500/10"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>,
        window.document.body
      )}

      {/* Top modern Workspace Toolbar */}
      {readMode !== 'focus' && (
        <div className={`${activeTheme.toolbar} px-6 py-4 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between shrink-0 shadow-sm transition-colors duration-250`}>
          {/* Document selection section */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <span className={`font-bold text-xs tracking-wider uppercase ml-1 shrink-0 ${activeTheme.textMuted}`}>Tài liệu đang học:</span>

            {/* Custom Dropdown Selector */}
            <div className="relative" ref={docDropdownRef}>
              <button
                onClick={() => setIsDocDropdownOpen(!isDocDropdownOpen)}
                className={`flex items-center justify-between w-full sm:w-64 bg-slate-50/50 border hover:bg-slate-100/50 text-sm font-medium rounded-xl px-4 py-2.5 focus:outline-none transition-colors ${activeTheme.card} ${activeTheme.text}`}
              >
                <span className="truncate mr-2 font-semibold">
                  {id ? documentsList.find(d => d.id == id)?.title || 'Đang tải...' : 'Chưa chọn tài liệu'}
                </span>
                <ChevronRight className="w-4 h-4 opacity-50 rotate-90 shrink-0" />
              </button>

              {isDocDropdownOpen && (
                <div className={`absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl border shadow-xl p-3 z-50 flex flex-col gap-3 animate-in fade-in slide-in-from-top-3 duration-200 ${activeTheme.card} ${activeTheme.bg}`}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="Tìm tài liệu nhanh..."
                      className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${activeTheme.input}`}
                      value={docSearchQuery}
                      onChange={(e) => setDocSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block px-2 mb-1">Tài liệu gần đây</span>
                    {filteredDropdownDocs.length > 0 ? (
                      filteredDropdownDocs.map(doc => (
                        <button
                          key={doc.id}
                          onClick={() => {
                            setIsDocDropdownOpen(false);
                            navigate(`/reader/${doc.id}`);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${id == doc.id
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-slate-150/40 hover:text-blue-600'
                            }`}
                        >
                          <span className="truncate flex-grow">{doc.title}</span>
                          {id == doc.id && <span className="text-[9px] bg-white/25 px-1.5 py-0.5 rounded ml-2 shrink-0">Đọc</span>}
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400 italic block px-2 py-4 text-center">Không tìm thấy tài liệu</span>

                    )}
                  </div>

                  <div className="border-t border-gray-150/30 pt-2 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setIsDocDropdownOpen(false);
                        setIsSelectModalOpen(true);
                      }}
                      className="flex-grow py-2 text-center text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    >
                      Xem tất cả
                    </button>
                    <button
                      onClick={() => {
                        setIsDocDropdownOpen(false);
                        setIsUploadModalOpen(true);
                      }}
                      className="flex-grow py-2 text-center text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors border border-dashed border-emerald-300"
                    >
                      + Tải file mới
                    </button>

                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-4 shrink-0 flex flex-col items-center justify-center border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-6">
                        <button
                          onClick={() => {
                            setCurrentPage(p => Math.max(1, p - 1));
                            readerContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={validCurrentPage === 1}
                          className="p-3 rounded-full bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          title="Trang trước"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        </button>

                        <span className="text-sm font-bold text-gray-700 bg-gray-50 px-6 py-2.5 rounded-full border border-gray-200 shadow-sm">
                          Trang {validCurrentPage} / {totalPages}
                        </span>

                        <button
                          onClick={() => {
                            setCurrentPage(p => Math.min(totalPages, p + 1));
                            readerContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={validCurrentPage === totalPages}
                          className="p-3 rounded-full bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          title="Trang tiếp theo"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border border-blue-100 w-full sm:w-auto"
            >
              <Upload className="w-4 h-4" />
              Tải lên tài liệu
            </button>
          </div>

          {/* Settings & display controls */}
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 mt-2 xl:mt-0">
            {/* Show/Hide Pinyin toggle */}
            <button
              onClick={() => setShowPinyin(!showPinyin)}
              className={`flex-grow sm:flex-grow-0 justify-center flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${showPinyin
                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50'
                }`}
            >
              <span>Pinyin</span>
              <span className={`w-2 h-2 rounded-full ${showPinyin ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />
            </button>

            {/* Font family switcher */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
              <button
                onClick={() => setFontMode('sans')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${fontMode === 'sans' ? 'bg-slate-100 text-slate-800' : 'text-slate-505 hover:text-slate-800'
                  }`}
                title="Font Không chân (Sans-Serif)"
              >
                Sans
              </button>
              <button
                onClick={() => setFontMode('serif')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all font-serif ${fontMode === 'serif' ? 'bg-slate-100 text-slate-800 animate-in' : 'text-slate-505 hover:text-slate-800'
                  }`}
                title="Font Có chân (Serif)"
              >
                Serif
              </button>
              <button
                onClick={() => setFontMode('kaiti')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${fontMode === 'kaiti' ? 'bg-slate-100 text-slate-800' : 'text-slate-505 hover:text-slate-800'
                  }`}
                style={{ fontFamily: '"KaiTi", "STKaiti", "楷体", serif' }}
                title="Font Thư pháp (Kaiti 楷体)"
              >
                楷体
              </button>

            </div>

            {/* Font size adjustments */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
              <button
                onClick={() => setFontSize(Math.max(16, fontSize - 2))}
                className="px-3 py-1.5 hover:bg-slate-50 rounded-lg text-slate-600 font-bold transition-colors"
                title="Giảm kích thước chữ"
              >
                A-
              </button>
              <span className="px-2.5 text-xs font-black text-slate-850">{fontSize}px</span>
              <button
                onClick={() => setFontSize(Math.min(48, fontSize + 2))}
                className="px-3 py-1.5 hover:bg-slate-50 rounded-lg text-slate-600 font-bold transition-colors"
                title="Tăng kích thước chữ"
              >
                A+
              </button>
            </div>

            {/* Fullscreen Button */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5">
              <button
                onClick={toggleFullscreen}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-all"
                title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình (Fullscreen)"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Sidebar toggle button (on Desktop layout) */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-all hidden lg:block`}
              title={isSidebarOpen ? "Thu gọn Sidebar" : "Mở rộng Sidebar"}
            >
              <ChevronRight className={`w-4 h-4 transform transition-transform duration-200 ${isSidebarOpen ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Workspace Layout Grid */}
      <div className="flex flex-col lg:flex-row flex-1 p-4 md:p-6 gap-6 overflow-hidden h-auto lg:h-[calc(100vh-175px)]">

        {/* Left pane: A4 Smart Reader Area */}
        <div
          className={`h-full flex flex-col transition-all duration-300 ease-in-out ${!isSidebarOpen
              ? 'w-full'
              : 'w-full lg:w-[65%]'
            }`}
        >
          <div className={`flex flex-col flex-1 rounded-3xl overflow-hidden relative border transition-colors duration-250 ${activeTheme.sheet} bg-white`}>
            {!document && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl">
                <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6">
                  <FileText className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-855 mb-2">Chưa chọn tài liệu học tập</h2>
                <p className="text-slate-505 mb-8 max-w-sm text-sm">Vui lòng tải lên một file tiếng Trung hoặc chọn một tài liệu từ danh sách để bắt đầu tra cứu và học.</p>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md shadow-blue-650/20 hover:bg-blue-700 transition-colors"
                >
                  Tải lên tài liệu ngay
                </button>
              </div>
            )}

            {document && (
              <>
                {/* Canvas Drawing Tools */}
                <div className={`px-5 py-3.5 flex items-center justify-between gap-3 shrink-0 ${activeTheme.toolbar}`}>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 shadow-sm">
                    {/* Pointer */}
                    <button
                      onClick={() => setActiveTool('pointer')}
                      className={`p-2 rounded-lg transition-all ${activeTool === 'pointer' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      title="Con trỏ chuột tra cứu (Pointer)"
                    >
                      <MousePointer className="w-3.5 h-3.5" />
                    </button>

                    {/* Highlight Dropdown */}
                    <div className="relative group">
                      <button
                        onClick={() => setActiveTool('highlight')}
                        className={`p-2 rounded-lg transition-all flex items-center gap-1.5 ${activeTool === 'highlight' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        title="Bôi màu Highlight văn bản (H)"
                      >
                        <Highlighter className="w-3.5 h-3.5" />
                        <span
                          className="w-3 h-3 rounded-full border border-slate-350 inline-block shadow-sm"
                          style={{ backgroundColor: activeColor }}
                        />
                      </button>
                      <div className="absolute left-0 mt-1 hidden group-hover:flex hover:flex flex-col bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 gap-1.5 z-30 w-44">
                        {HIGHLIGHT_COLORS.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setActiveColor(c.value);
                              setActiveTool('highlight');
                            }}
                            className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 w-full transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-slate-200 inline-block shadow-sm"
                                style={{ backgroundColor: c.value }}
                              />
                              <span>{c.name.split(' ')[0]}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pencil */}
                    <button
                      onClick={() => setActiveTool('pencil')}
                      className={`p-2 rounded-lg transition-all ${activeTool === 'pencil' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      title="Viết vẽ tay (Pencil)"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Eraser */}
                    <button
                      onClick={() => setActiveTool('eraser')}
                      className={`p-2 rounded-lg transition-all ${activeTool === 'eraser' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      title="Tẩy nét vẽ (Eraser)"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                    </button>

                    {/* Text Note */}
                    <button
                      onClick={() => setActiveTool('textNote')}
                      className={`p-2 rounded-lg transition-all ${activeTool === 'textNote' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      title="Thêm Ghi chú văn bản (Text Note)"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>

                    {/* Sticky Note */}
                    <button
                      onClick={() => setActiveTool('stickyNote')}
                      className={`p-2 rounded-lg transition-all ${activeTool === 'stickyNote' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      title="Thêm Ghi chú nổi (Sticky Note)"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveAnnotations}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/10 active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Lưu ghi chú</span>
                    </button>
                    <button
                      onClick={handleExportDocx}
                      className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-500" />
                      <span>Xuất Word (.docx)</span>
                    </button>
                  </div>
                </div>

                {/* A4 sheet page content */}
                <div className={`flex-grow flex flex-col max-w-4xl mx-auto w-full pt-8 pb-4 px-4 sm:px-16 overflow-hidden ${activeTheme.sheet}`}>
                  <h1 className="text-xl sm:text-2xl font-black mb-5 text-center leading-snug shrink-0 break-all border-b pb-4 border-slate-100/55">{document.title}</h1>

                  <div
                    ref={readerContainerRef}
                    className={`flex-1 break-words overflow-y-auto pr-3 select-text scrollbar-thin ${fontStyles[fontMode]}`}
                    style={{ fontSize: `${fontSize}px`, lineHeight: '2.4', wordSpacing: '0', letterSpacing: '0.02em' }}
                    onMouseUp={handleTextSelection}
                  >
                    <div className="relative min-h-full">
                      {/* Drawing canvas layer */}
                      <canvas
                        ref={canvasRef}
                        className={`absolute inset-0 z-10 w-full h-full ${(activeTool === 'pencil' || activeTool === 'eraser') ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
                          }`}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                      />

                      {/* CJK segment mapping render — grouped by paragraph / line */}
                      <div className="relative z-0 pb-12 pr-2">
                        {(() => {
                          // Pre-group segments into paragraphs → lines while tracking absIndex
                          const absBase = (validCurrentPage - 1) * WORDS_PER_PAGE;
                          const paragraphs = [];
                          let curPara = [];
                          let curLine = [];

                          const flushLine = () => {
                            if (curLine.length > 0) { curPara.push(curLine); curLine = []; }
                          };
                          const flushPara = () => {
                            flushLine();
                            if (curPara.length > 0) { paragraphs.push(curPara); curPara = []; }
                          };

                          currentSegments.forEach((word, relIndex) => {
                            const absIndex = absBase + relIndex;
                            const w = typeof word === 'string'
                              ? word.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
                              : word;

                            if (w === '\n\n') { flushPara(); }
                            else if (w === '\n') { flushLine(); }
                            else { curLine.push({ word: w, absIndex }); }
                          });
                          flushPara();

                          return paragraphs.map((lines, pi) => {
                            let isHeading = false;
                            let isCenter = false;
                            let isIndent = false;

                            // Robustly consume markers regardless of how segmenter splits them
                            while (lines.length > 0) {
                              let strippedAny = false;
                              ['#HEADING#', '#CENTER#', '#INDENT#'].forEach(marker => {
                                let lineText = lines[0].map(w => w.word).join('');
                                let markerIndex = lineText.indexOf(marker);
                                if (markerIndex !== -1) {
                                  if (marker === '#HEADING#') isHeading = true;
                                  if (marker === '#CENTER#') isCenter = true;
                                  if (marker === '#INDENT#') isIndent = true;
                                  
                                  strippedAny = true;
                                  let currentStrIndex = 0;
                                  let charsToRemove = marker.length;
                                  let charsRemoved = 0;
                                  
                                  for (let i = 0; i < lines[0].length; i++) {
                                    let w = lines[0][i].word;
                                    let newW = '';
                                    for (let j = 0; j < w.length; j++) {
                                      if (currentStrIndex >= markerIndex && charsRemoved < charsToRemove) {
                                        charsRemoved++; // skip char
                                      } else {
                                        newW += w[j];
                                      }
                                      currentStrIndex++;
                                    }
                                    lines[0][i].word = newW;
                                  }
                                }
                              });
                              
                              if (!strippedAny && lines[0].map(w => w.word).join('').trim() !== '') {
                                break;
                              }
                              
                              if (lines[0].map(w => w.word).join('').trim() === '') {
                                lines.shift();
                              }
                            }
                            
                            // Remove empty lines that might have been left
                            if (lines.length > 0 && lines[0].length === 0) lines.shift();
                            if (lines.length === 0) return null;

                            const paraClass = isHeading 
                               ? "mb-6 text-[1.4em] font-bold text-slate-900 border-b border-slate-200/50 pb-2" 
                               : "mb-4 text-slate-800 leading-relaxed";

                            return (
                            <div key={pi} className={paraClass}>
                              {lines.map((lineWords, li) => (
                                <div key={li} className={`flex flex-wrap leading-none mb-1 ${isHeading ? 'mb-2' : ''} ${isCenter ? 'justify-center' : ''} ${(isIndent && li === 0 && !isHeading && !isCenter) ? 'pl-10' : ''}`}>
                                  {lineWords.map(({ word, absIndex }) => {
                                    const highlightColor = annotations.highlights[absIndex];
                                    const hasTextNote = annotations.textNotes[absIndex];
                                    const hasStickyNote = annotations.stickyNotes[absIndex];
                                    const isWordSelected = selectedWord === word;
                                    const noteInfo = hasTextNote ? parseNoteContent(hasTextNote) : null;
                                    const stickyInfo = hasStickyNote ? parseNoteContent(hasStickyNote) : null;

                                    return (
                                      <span
                                        key={absIndex}
                                        data-abs-index={absIndex}
                                        onClick={(e) => handleWordClick(word, absIndex, e)}
                                        onMouseEnter={(e) => handleWordMouseEnter(absIndex, e)}
                                        onMouseLeave={handleWordMouseLeave}
                                        style={highlightColor ? { backgroundColor: highlightColor } : undefined}
                                        className={`inline-flex flex-col items-center justify-end cursor-pointer rounded-sm transition-all duration-150 relative align-bottom ${isWordSelected && !highlightColor ? 'bg-blue-100/80 text-blue-900 ring-1 ring-blue-300' : ''
                                          } ${!highlightColor && !isWordSelected ? 'hover:bg-blue-50/50 hover:text-blue-700' : ''}`}
                                      >
                                        <span className="leading-none flex items-center">
                                          {word}
                                          {hasTextNote && (
                                            <span
                                              className="ml-0.5 text-[0.55em] cursor-pointer hover:scale-125 transition-transform select-none"
                                              title={noteInfo.text}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                startEditingNote(absIndex, 'text', hasTextNote);
                                              }}
                                            >
                                              {noteInfo.icon}
                                            </span>
                                          )}
                                          {hasStickyNote && (
                                            <span
                                              className="ml-0.5 text-[0.55em] cursor-pointer hover:scale-125 transition-transform select-none animate-bounce"
                                              title={stickyInfo.text}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                startEditingNote(absIndex, 'sticky', hasStickyNote);
                                              }}
                                            >
                                              📌
                                            </span>
                                          )}
                                        </span>
                                        {showPinyin && (
                                          <span className="text-[0.4em] text-slate-500 font-normal leading-none mt-1.5 select-none text-center block">
                                            {pinyin(word, { type: 'string' })}
                                          </span>
                                        )}
                                      </span>
                                    );
                                  })}
                                </div>
                                ))}
                              </div>
                            );
                          });
                        })()}
                      </div>

                    </div>
                  </div>

                  {/* Pagination bar */}
                  {totalPages > 1 && (
                    <div className="mt-2 shrink-0 flex flex-col items-center justify-center border-t border-slate-100/60 pt-3 pb-1">
                      <div className="flex items-center gap-6">
                        <button
                          onClick={() => {
                            setCurrentPage(p => Math.max(1, p - 1));
                            readerContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={validCurrentPage === 1}
                          className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          title="Trang trước"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <span className="text-xs font-bold text-slate-700 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/80 shadow-sm">
                          Trang {validCurrentPage} / {totalPages}
                        </span>

                        <button
                          onClick={() => {
                            setCurrentPage(p => Math.min(totalPages, p + 1));
                            readerContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={validCurrentPage === totalPages}
                          className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          title="Trang tiếp theo"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Backdrop for tablet/mobile sidebar drawer overlay */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/35 z-40 lg:hidden"
          />
        )}

        {/* Right pane: Collapsible Responsive Sidebar */}
        {document && (
          <div
            className={`bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col shrink-0 transition-all duration-300 ease-in-out z-50 ${isSidebarOpen
                ? 'fixed inset-y-0 right-0 w-[85vw] sm:w-[380px] lg:static lg:w-[35%] lg:h-full translate-x-0'
                : 'fixed inset-y-0 right-0 w-[85vw] sm:w-[380px] lg:hidden translate-x-full lg:translate-x-0'
              }`}
          >
            {/* Sidebar Tab Header */}
            <div className="flex border-b border-slate-150 bg-slate-50/50 shrink-0">
              <button
                onClick={() => setSidebarTab('dict')}
                className={`flex-1 py-3.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${sidebarTab === 'dict'
                    ? 'border-blue-600 text-blue-600 bg-white font-extrabold shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Từ điển</span>
              </button>
              <button
                onClick={() => setSidebarTab('chat')}
                className={`flex-1 py-3.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${sidebarTab === 'chat'
                    ? 'border-blue-600 text-blue-600 bg-white font-extrabold shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Trợ lý AI</span>
              </button>
              <button
                onClick={() => setSidebarTab('stats')}
                className={`flex-1 py-3.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${sidebarTab === 'stats'
                    ? 'border-blue-600 text-blue-600 bg-white font-extrabold shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Tiến trình</span>
              </button>
            </div>

            {/* Sidebar Tab Content panels */}
            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">

              {/* Tab 1: Dictionary lookup detail view */}
              {sidebarTab === 'dict' && (
                <div className="h-full">
                  {!selectedWord ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12 px-6">
                      <div className="w-14 h-14 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-5">
                        <Search className="w-6 h-6" />
                      </div>
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3">Tra cứu thông minh</h3>
                      <p className="text-slate-500 text-xs leading-relaxed max-w-[260px] mx-auto">
                        Nhấp chọn chữ Hán hoặc bôi đen câu văn trong tài liệu để tra cứu từ điển mở rộng và giải nghĩa ngữ cảnh AI ngay lập tức.
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={closeWordCard}
                        className="absolute -top-1 right-0 p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-655 rounded-full transition-colors z-10"
                        title="Đóng bảng tra từ"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <WordCard
                        word={selectedWord}
                        data={vocabData}
                        isLoading={isLoadingVocab}
                        onWordClick={(w) => {
                          setSelectedWord(w);
                          setVocabData(null);
                          setIsLoadingVocab(true);
                          getVocabulary(w).then(d => setVocabData(d)).finally(() => setIsLoadingVocab(false));
                        }}
                        documentId={id}
                        documentTitle={document?.title}
                        documentText={segments.join('')}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: General Document AI Chat assistant */}
              {sidebarTab === 'chat' && (
                <div className="h-full flex flex-col min-h-[300px]">
                  {/* Chat messages */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin min-h-[220px] flex flex-col mb-4">
                    {docChatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${msg.sender === 'user'
                            ? 'bg-blue-600 text-white self-end ml-auto rounded-tr-none'
                            : 'bg-slate-50 text-slate-800 border border-slate-100 mr-auto rounded-tl-none font-medium'
                          }`}
                      >
                        <div className="whitespace-pre-line">{msg.text}</div>
                      </div>
                    ))}
                    {isSendingDocChat && (
                      <div className="bg-slate-55 text-slate-855 mr-auto rounded-tl-none rounded-2xl p-3 text-xs leading-relaxed font-medium flex items-center gap-1.5 max-w-[85%]">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="text-[10px] text-gray-400 font-bold ml-1">AI đang soạn câu trả lời...</span>
                      </div>
                    )}
                    <div ref={docChatBottomRef} />
                  </div>

                  {/* Suggestions triggers */}
                  {docChatMessages.length === 1 && (
                    <div className="flex flex-col gap-1.5 mb-4">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Hỏi nhanh AI</span>
                      <button
                        onClick={(e) => handleSendDocChat(e, "Hãy tóm tắt ngắn gọn nội dung chính của tài liệu này.")}
                        className="text-left px-3 py-2 bg-slate-50 hover:bg-blue-50/50 hover:text-blue-600 border border-slate-150 rounded-xl text-[11px] font-semibold text-slate-655 transition-colors"
                      >
                        📖 Tóm tắt nội dung chính tài liệu?
                      </button>
                      <button
                        onClick={(e) => handleSendDocChat(e, "Tài liệu này nói về chủ đề gì và có những từ vựng HSK nào khó?")}
                        className="text-left px-3 py-2 bg-slate-50 hover:bg-blue-50/50 hover:text-blue-600 border border-slate-150 rounded-xl text-[11px] font-semibold text-slate-655 transition-colors"
                      >
                        💡 Chủ đề & Từ vựng quan trọng?
                      </button>
                    </div>
                  )}

                  {/* Form input controls */}
                  <form onSubmit={(e) => handleSendDocChat(e)} className="flex gap-2 shrink-0 border-t border-slate-100 pt-3">
                    <input
                      type="text"
                      value={docChatInput}
                      onChange={(e) => setDocChatInput(e.target.value)}
                      disabled={isSendingDocChat}
                      placeholder="Hỏi AI về chủ đề hoặc tóm tắt..."
                      className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20"
                    />
                    <button
                      type="submit"
                      disabled={isSendingDocChat || !docChatInput.trim()}
                      className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl transition-colors shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 3: Study progress statistics dashboard */}
              {sidebarTab === 'stats' && (
                <div className="space-y-6">
                  {/* Reading stats card */}
                  <div className="bg-blue-50/20 border border-blue-100 rounded-2xl p-4 space-y-4">
                    <h4 className="text-xs font-black uppercase text-blue-800 tracking-wider flex items-center gap-1.5 border-b border-blue-100 pb-2">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Thông số bài học</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-450 font-bold uppercase block">Thời gian học</span>
                        <span className="text-lg font-black text-slate-850 flex items-center gap-1.5">
                          {Math.floor(readingSeconds / 60)}m {readingSeconds % 60}s
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-455 font-bold uppercase block">Tổng ký tự</span>
                        <span className="text-lg font-black text-slate-850">{totalDocChars} từ</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-455 font-bold uppercase block">Đã tra từ điển</span>
                        <span className="text-lg font-black text-slate-850">{lookupCount} từ</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-455 font-bold uppercase block">Đã bôi màu</span>
                        <span className="text-lg font-black text-slate-850">{Object.keys(annotations.highlights).length} nét</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-455 font-bold uppercase block">Số ghi chú</span>
                        <span className="text-lg font-black text-slate-850">
                          {Object.keys(annotations.textNotes).length + Object.keys(annotations.stickyNotes).length} ghi chú
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-455 font-bold uppercase block">Đã lưu sổ tay</span>
                        <span className="text-lg font-black text-emerald-600 font-extrabold flex items-center gap-1">
                          {savedWordsInDoc} từ
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Student Gamification card */}
                  {user && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-4">
                      <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span>Học viên Hanora</span>
                      </h4>

                      {/* Streak & XP Display */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-5 h-5 text-orange-500 fill-orange-500/10" />
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block leading-none">Chuỗi học tập</span>
                            <span className="text-sm font-black text-slate-805">{user.streak || 0} ngày</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="w-5 h-5 text-blue-500" />
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block leading-none">Trình độ XP</span>
                            <span className="text-sm font-black text-slate-805">{user.level || 'HSK 1'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Daily minutes progress */}
                      <div className="space-y-2 border-t border-slate-200/50 pt-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-semibold">Mục tiêu hằng ngày:</span>
                          <span className="font-extrabold text-slate-855">
                            {user.todayMinutes || 0} / {user.targetDailyMinutes || 20} phút
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, ((user.todayMinutes || 0) / (user.targetDailyMinutes || 20)) * 100)}%`
                            }}
                          />
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 font-semibold italic text-center pt-2 leading-relaxed">
                        Thời gian đọc sách và tra từ của bạn đang được tự động đồng bộ để tính toán XP học tập hàng ngày!
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReaderPage;
