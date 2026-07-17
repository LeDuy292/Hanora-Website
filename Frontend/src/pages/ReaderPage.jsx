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
import VisualDocumentReader from '../components/reader/VisualDocumentReader';
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
  Activity, GraduationCap, Trophy, Flame, Play, Clock, Search, Send,
  Copy, Trash2, Undo2, Redo2
} from 'lucide-react';

const HIGHLIGHT_COLORS = [
  { id: 'yellow', name: 'Vàng (Từ mới)', value: '#fef08a' },
    { id: 'green', name: 'Xanh lá (Đã hiểu)', value: '#bbf7d0' },
  { id: 'blue', name: 'Xanh dương (Quan trọng)', value: '#bfdbfe' },
    { id: 'purple', name: 'Tím (Ngữ pháp)', value: '#e9d5ff' },
  { id: 'pink', name: 'Hồng (Thành ngữ)', value: '#fbcfe8' },
    { id: 'red', name: 'Đỏ (Cần xem lại)', value: '#fecaca' }
];

const DRAWING_COLORS = [
  { id: 'red', name: 'Do', value: '#ef4444' },
  { id: 'yellow', name: 'Vang', value: '#facc15' },
  { id: 'green', name: 'Xanh la', value: '#22c55e' },
  { id: 'blue', name: 'Xanh duong', value: '#2563eb' },
  { id: 'purple', name: 'Tim', value: '#9333ea' },
  { id: 'black', name: 'Den', value: '#111827' }
];

const PEN_WIDTHS = [
  { value: 1, label: '1px' },
  { value: 3, label: '3px' },
  { value: 5, label: '5px' },
  { value: 8, label: '8px' }
];

const PEN_STYLES = [
  { id: 'solid', name: 'Net lien' },
  { id: 'dashed', name: 'Net dut' },
  { id: 'highlight', name: 'Highlight' },
  { id: 'pencil', name: 'But chi' },
  { id: 'marker', name: 'Marker' }
];

const NOTE_CATEGORIES = [
  { id: 'text', name: 'Ghi chú văn bản', icon: '📝', prefix: '[Text] ' },
  { id: 'vocab', name: 'Ghi chú từ vựng', icon: '📖', prefix: '[Vocabulary] ' },
    { id: 'grammar', name: 'Ghi chú ngữ pháp', icon: '💡', prefix: '[Grammar] ' },
    { id: 'personal', name: 'Nhận xét cá nhân', icon: '👤', prefix: '[Personal] ' }
];

const EMPTY_ANNOTATIONS = {
  pencilStrokes: {},
  highlights: {},
  highlightRanges: {},
  textNotes: {},
  stickyNotes: {}
};

const getVisualDocumentType = (doc) => {
  if (!(doc?.fileUrl || doc?.FileUrl)) return null;
  const type = String(doc.fileType || doc.FileType || '').toLowerCase();
  const source = String(doc.originalFilename || doc.OriginalFilename || doc.fileUrl || '').toLowerCase();

  if (type === 'pdf' || source.endsWith('.pdf')) return 'pdf';
  if (type === 'image' || /\.(png|jpe?g|webp)$/i.test(source)) return 'image';
  return null;
};

const normalizeAnnotations = (value = {}) => ({
  pencilStrokes: value.pencilStrokes || {},
  highlights: value.highlights || {},
  highlightRanges: value.highlightRanges || {},
  textNotes: value.textNotes || {},
  stickyNotes: value.stickyNotes || {}
});

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
  const [documentError, setDocumentError] = useState('');
  const [segments, setSegments] = useState([]);
  const WORDS_PER_PAGE = 500;
  const textTotalPages = Math.ceil(segments.length / WORDS_PER_PAGE) || 1;
  const [selectedWord, setSelectedWord] = useState(null);
  const [vocabData, setVocabData] = useState(null);
  const [isLoadingVocab, setIsLoadingVocab] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [showPinyin, setShowPinyin] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(!id);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [documentsList, setDocumentsList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const visualDocumentType = getVisualDocumentType(document);
  const visualOcrJsonUrl = document?.ocrJsonUrl || document?.OcrJsonUrl || null;
  const showVisualReader = Boolean(visualDocumentType);
  const readerContainerRef = useRef(null);
  const navigate = useNavigate();

  // Settings
  const [fontMode, setFontMode] = useState('sans'); // sans, serif, kaiti
  const themeMode = 'light';
  const readMode = 'normal';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('dict'); // dict, chat, stats
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [readerSidebarTop, setReaderSidebarTop] = useState(216);
  const [readerSidebarBottom, setReaderSidebarBottom] = useState(8);

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
  const [annotations, setAnnotations] = useState(EMPTY_ANNOTATIONS);

  // Editor states
  const [activeTool, setActiveTool] = useState('pointer'); // pointer, highlight, pencil, eraser, textNote, stickyNote
  const [activeColor, setActiveColor] = useState('#fef08a'); // yellow default

  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [penColor, setPenColor] = useState('#ef4444');
  const [penWidth, setPenWidth] = useState(3);
  const [penStyle, setPenStyle] = useState('solid');
  const [redoStrokes, setRedoStrokes] = useState({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [editingNote, setEditingNote] = useState(null); // { absIndex, type, text, category }
  const [hoveredNote, setHoveredNote] = useState(null); // { text, x, y }
  const [highlightMenu, setHighlightMenu] = useState({
    visible: false,
    absIndex: -1,
    range: null,
    x: 0,
    y: 0
  });

  // Bubble menu state
  const [bubbleMenu, setBubbleMenu] = useState({
    visible: false,
    text: '',
    startIndex: -1,
    endIndex: -1,
    x: 0,
    y: 0
  });

  const canvasRef = useRef(null);
  const drawingPageRef = useRef(1);
  const longPressTimerRef = useRef(null);
  const visualSelectionRef = useRef(null);
  const ignoreNextWordClickRef = useRef(false);
  const [visualSelectionRange, setVisualSelectionRange] = useState(null);

  useEffect(() => () => clearLongPressTimer(), []);
  useEffect(() => {
    const syncSidebarForViewport = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    syncSidebarForViewport();
    window.addEventListener('resize', syncSidebarForViewport);
    return () => window.removeEventListener('resize', syncSidebarForViewport);
  }, []);
  useEffect(() => {
    let frameId = 0;
    const updateSidebarPosition = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const maxTop = 216;
        const minTop = 109;
        const footer = window.document.querySelector('footer');
        const footerTop = footer?.getBoundingClientRect?.().top ?? window.innerHeight;
        const footerOverlap = Math.max(0, window.innerHeight - footerTop);

        setReaderSidebarTop(Math.max(minTop, maxTop - window.scrollY));
        setReaderSidebarBottom(footerOverlap > 0 ? footerOverlap + 12 : 8);
      });
    };

    updateSidebarPosition();
    window.addEventListener('scroll', updateSidebarPosition, { passive: true });
    window.addEventListener('resize', updateSidebarPosition);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', updateSidebarPosition);
      window.removeEventListener('resize', updateSidebarPosition);
    };
  }, []);

  useEffect(() => {
    if (!id) {
      setDocument(null);
      setDocumentError('');
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
        setDocumentError('');

        const status = String(doc.status || '').toLowerCase();
        if (status === 'failed' || doc.status === 2) {
          setSegments([]);
                    setDocumentError(doc.processingError || doc.extractedText || 'Không thể xử lý tài liệu này. Vui lòng thử tài liệu rõ hơn hoặc định dạng khác.');
          return;
        }

        if ((status === 'processing' || doc.status === 0) && !doc.extractedText) {
          setSegments([]);
                    setDocumentError('Tài liệu đang được xử lý OCR. Vui lòng chờ trong giây lát rồi tải lại trang.');
          return;
        }

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
      setAnnotations(EMPTY_ANNOTATIONS);
      return;
    }
    const fetchAnnotations = async () => {
      try {
        const res = await getDocumentAnnotations(id);
        if (res && res.annotationsJson) {
          const parsed = JSON.parse(res.annotationsJson);
          setAnnotations(normalizeAnnotations(parsed));
        } else {
          setAnnotations(EMPTY_ANNOTATIONS);
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
    const safeTitle = title || 'tài liệu';

    toast.confirm(
      `Bạn có chắc chắn muốn xóa tài liệu "${safeTitle}" không? Hành động này sẽ xóa tất cả ghi chú, nét vẽ và dữ liệu liên quan.`,
      async () => {
        try {
          await deleteDocument(docId);
          toast.success('Xóa tài liệu thành công!');
          const docs = await getMyDocuments();
          setDocumentsList(docs);

          if (String(docId) === String(id)) {
            const nextDoc = docs.find(d => String(d.id) !== String(docId));
            if (nextDoc) {
              navigate('/reader/' + nextDoc.id);
            } else {
              setDocument(null);
              setSegments([]);
              setAnnotations(EMPTY_ANNOTATIONS);
              navigate('/reader');
            }
          }
        } catch (error) {
          console.error(error);
          toast.error(error.message || 'Không thể xóa tài liệu.');
        }
      },
      'Xóa tài liệu'
    );
  };

  const currentPageRef = useRef(currentPage);
  const textTotalPagesRef = useRef(textTotalPages);
  const readingSecondsRef = useRef(readingSeconds);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    textTotalPagesRef.current = textTotalPages;
  }, [textTotalPages]);

  useEffect(() => {
    readingSecondsRef.current = readingSeconds;
  }, [readingSeconds]);

  const saveReadingProgress = async () => {
    if (!document?.id || String(document.status || '').toLowerCase() === 'failed' || document.status === 2) return;
    const currPage = currentPageRef.current;
    const totPages = Math.max(currPage, textTotalPagesRef.current || 1);
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

  const applyStrokeStyle = (ctx, stroke) => {
    const style = stroke.style || stroke.tool || 'solid';
    const baseWidth = stroke.width || 3;

    ctx.strokeStyle = stroke.color || '#ef4444';
    ctx.lineWidth = style === 'highlight' ? baseWidth * 3 : baseWidth;
    ctx.lineCap = style === 'dashed' ? 'butt' : 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = style === 'highlight' ? 0.34 : style === 'marker' ? 0.72 : 1;
    ctx.setLineDash(style === 'dashed' ? [baseWidth * 4, baseWidth * 2.5] : []);
  };

  const drawStroke = (ctx, stroke, width, height) => {
    if (!stroke?.points?.length) return;

    ctx.save();
    applyStrokeStyle(ctx, stroke);
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x * width, stroke.points[i].y * height);
    }
    ctx.stroke();
    ctx.restore();
  };

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
      drawStroke(ctx, stroke, width, height);
    });

    // Draw current stroke
    if (activeTool === 'pencil' && currentStroke.length >= 1) {
      drawStroke(ctx, {
        color: penColor,
        width: penWidth,
        style: penStyle,
        tool: penStyle,
        points: currentStroke
      }, width, height);
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [annotations.pencilStrokes, currentPage, currentStroke, activeTool, penColor, penWidth, penStyle]);

  useEffect(() => {
    const handleResize = () => {
      drawCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [annotations.pencilStrokes, currentPage, currentStroke, activeTool, penColor, penWidth, penStyle]);

  // Pointer events for Canvas Pencil / Eraser
  const getCanvasPageFromEvent = (event) => Number(event?.currentTarget?.dataset?.pageNumber) || drawingPageRef.current || currentPage;

  const getCanvasFromEvent = (event) => event?.currentTarget || canvasRef.current;

  const handlePointerDown = (e) => {
    const canvas = getCanvasFromEvent(e);
    if (!canvas) return;

    const pageForEvent = getCanvasPageFromEvent(e);
    drawingPageRef.current = pageForEvent;
    if (pageForEvent !== currentPage) setCurrentPage(pageForEvent);
    canvasRef.current = canvas;

    const rect = canvas.getBoundingClientRect();
    const xPercent = (e.clientX - rect.left) / rect.width;
    const yPercent = (e.clientY - rect.top) / rect.height;

    if (activeTool === 'pencil') {
      setIsDrawing(true);
      setCurrentStroke([{ x: xPercent, y: yPercent }]);
    } else if (activeTool === 'eraser') {
      const targetToken = window.document
        .elementsFromPoint(e.clientX, e.clientY)
        .map(el => el?.closest?.('[data-abs-index]'))
        .find(Boolean);

      if (targetToken) {
        const absIndex = Number(targetToken.dataset.absIndex);
        if (eraseAnnotationAt(absIndex)) {
          return;
        }
      }

      setIsDrawing(true);
      eraseStrokesNear(xPercent, yPercent, pageForEvent, canvas);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    const canvas = getCanvasFromEvent(e);
    if (!canvas) return;
    canvasRef.current = canvas;

    const rect = canvas.getBoundingClientRect();
    const xPercent = (e.clientX - rect.left) / rect.width;
    const yPercent = (e.clientY - rect.top) / rect.height;

    if (activeTool === 'pencil') {
      setCurrentStroke(prev => [...prev, { x: xPercent, y: yPercent }]);
    } else if (activeTool === 'eraser') {
      eraseStrokesNear(xPercent, yPercent, drawingPageRef.current || getCanvasPageFromEvent(e), canvas);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    const pageForStroke = drawingPageRef.current || getCanvasPageFromEvent(e);
    setIsDrawing(false);
    if (activeTool === 'pencil' && currentStroke.length > 0) {
      const stroke = {
        color: penColor,
        width: penWidth,
        style: penStyle,
        tool: penStyle,
        points: currentStroke
      };
      setAnnotations(prev => {
        const pageStrokes = prev.pencilStrokes[pageForStroke] || [];
        const next = {
          ...prev,
          pencilStrokes: {
            ...prev.pencilStrokes,
            [pageForStroke]: [...pageStrokes, stroke]
          }
        };
        autoSaveAnnotations(next);
        return next;
      });
      setRedoStrokes(prev => ({ ...prev, [pageForStroke]: [] }));
    }
    setCurrentStroke([]);
  };

  const eraseStrokesNear = (xPercent, yPercent, page = currentPage, targetCanvas = canvasRef.current) => {
    const pageStrokes = annotations.pencilStrokes[page] || [];
    const canvas = targetCanvas;
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

    if (updatedStrokes.length === pageStrokes.length) return;

    setAnnotations(prev => {
      const next = {
        ...prev,
        pencilStrokes: {
          ...prev.pencilStrokes,
          [page]: updatedStrokes
        }
      };
      autoSaveAnnotations(next);
      return next;
    });
    setRedoStrokes(prev => ({ ...prev, [page]: [] }));
  };

  const handleUndoStroke = () => {
    const pageStrokes = annotations.pencilStrokes[currentPage] || [];
    if (pageStrokes.length === 0) return;

    const removedStroke = pageStrokes[pageStrokes.length - 1];
    const nextPageStrokes = pageStrokes.slice(0, -1);
    const next = normalizeAnnotations({
      ...annotations,
      pencilStrokes: {
        ...annotations.pencilStrokes,
        [currentPage]: nextPageStrokes
      }
    });

    setAnnotations(next);
    setRedoStrokes(prev => ({
      ...prev,
      [currentPage]: [removedStroke, ...(prev[currentPage] || [])]
    }));
    autoSaveAnnotations(next);
  };

  const handleRedoStroke = () => {
    const pageRedo = redoStrokes[currentPage] || [];
    if (pageRedo.length === 0) return;

    const [restoredStroke, ...remainingRedo] = pageRedo;
    const pageStrokes = annotations.pencilStrokes[currentPage] || [];
    const next = normalizeAnnotations({
      ...annotations,
      pencilStrokes: {
        ...annotations.pencilStrokes,
        [currentPage]: [...pageStrokes, restoredStroke]
      }
    });

    setAnnotations(next);
    setRedoStrokes(prev => ({
      ...prev,
      [currentPage]: remainingRedo
    }));
    autoSaveAnnotations(next);
  };

  // Annotations saving & exporting
  const autoSaveAnnotations = async (nextAnnotations) => {
    if (!id) return;
    try {
      await saveDocumentAnnotations(id, JSON.stringify(normalizeAnnotations(nextAnnotations)));
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  };

  const getTextForRange = (startOffset, endOffset, fallbackText = '') => {
    const start = Math.max(0, Math.min(startOffset, endOffset));
    const end = Math.max(startOffset, endOffset);

    if (showVisualReader) {
      const tokens = Array.from(readerContainerRef.current?.querySelectorAll('[data-abs-index]') || [])
        .filter(el => {
          const idx = Number(el.getAttribute('data-abs-index'));
          return idx >= start && idx <= end;
        })
        .map(el => Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE)?.textContent || '')
        .filter(Boolean);

      return (tokens.join('') || fallbackText || '').trim();
    }

    const boundedEnd = Math.min(segments.length - 1, end);
    return joinDocumentSegments(
      segments.slice(start, boundedEnd + 1).filter(part => !isStructureMarker(part))
    ).trim();
  };

  const getHighlightRangeAt = (absIndex, source = annotations) => {
    const ranges = Object.values(source.highlightRanges || {});
    const found = ranges.find(range =>
      Number(range.startOffset) <= absIndex && Number(range.endOffset) >= absIndex
    );

    if (found) {
      return found;
    }

    const color = source.highlights?.[absIndex];
    if (!color) return null;

    return {
      id: `legacy-${absIndex}`,
      startOffset: absIndex,
      endOffset: absIndex,
      selectedText: getTextForRange(absIndex, absIndex) || '',
      color,
      noteContent: source.textNotes?.[absIndex] || '',
      createdAt: null,
      updatedAt: null,
      legacy: true
    };
  };

  const createHighlightRange = (startOffset, endOffset, color = activeColor, fallbackText = '') => {
    const start = Math.max(0, Math.min(startOffset, endOffset));
    const end = Math.max(startOffset, endOffset);
    const now = new Date().toISOString();
    const rangeId = `hl_${Date.now()}_${start}_${end}`;
    const selectedText = getTextForRange(start, end, fallbackText);

    setAnnotations(prev => {
      const nextHighlights = { ...prev.highlights };
      for (let i = start; i <= end; i++) {
        if (showVisualReader || !isStructureMarker(segments[i])) {
          nextHighlights[i] = color;
        }
      }

      const next = normalizeAnnotations({
        ...prev,
        highlights: nextHighlights,
        highlightRanges: {
          ...prev.highlightRanges,
          [rangeId]: {
            id: rangeId,
            selectedText,
            startOffset: start,
            endOffset: end,
            color,
            noteContent: prev.textNotes?.[start] || '',
            createdAt: now,
            updatedAt: now
          }
        }
      });
      autoSaveAnnotations(next);
      return next;
    });
  };

  const updateHighlightColor = (range, color) => {
    if (!range) return;
    const start = Number(range.startOffset);
    const end = Number(range.endOffset);

    setAnnotations(prev => {
      const nextHighlights = { ...prev.highlights };
      for (let i = start; i <= end; i++) {
        if (nextHighlights[i]) {
          nextHighlights[i] = color;
        }
      }

      const nextRanges = { ...prev.highlightRanges };
      if (!range.legacy && nextRanges[range.id]) {
        nextRanges[range.id] = {
          ...nextRanges[range.id],
          color,
          updatedAt: new Date().toISOString()
        };
      }

      const next = normalizeAnnotations({
        ...prev,
        highlights: nextHighlights,
        highlightRanges: nextRanges
      });
      autoSaveAnnotations(next);
      return next;
    });

    setActiveColor(color);
    setHighlightMenu(prev => ({ ...prev, visible: false }));
  };

  const deleteHighlightRange = (range, options = {}) => {
    if (!range) return;
    const shouldConfirm = options.confirm !== false;
    const start = Number(range.startOffset);
    const end = Number(range.endOffset);

    const removeHighlight = () => {
      setAnnotations(prev => {
        const nextHighlights = { ...prev.highlights };
        for (let i = start; i <= end; i++) {
          delete nextHighlights[i];
        }

        const nextRanges = { ...prev.highlightRanges };
        if (!range.legacy) {
          delete nextRanges[range.id];
        }

        const next = normalizeAnnotations({
          ...prev,
          highlights: nextHighlights,
          highlightRanges: nextRanges
        });
        autoSaveAnnotations(next);
        return next;
      });
      setHighlightMenu(prev => ({ ...prev, visible: false }));
    };

    if (shouldConfirm) {
      toast.confirm('Ban co muon xoa highlight nay khong?', removeHighlight, 'Xoa highlight');
      return;
    }

    removeHighlight();
  };

  const eraseAnnotationAt = (absIndex) => {
    const range = getHighlightRangeAt(absIndex);
    const hasTextNote = !!annotations.textNotes[absIndex];
    const hasStickyNote = !!annotations.stickyNotes[absIndex];

    if (range) {
      deleteHighlightRange(range, { confirm: false });
      toast.success('Da xoa highlight.');
      return true;
    }

    if (hasTextNote || hasStickyNote) {
      setAnnotations(prev => {
        const nextTextNotes = { ...prev.textNotes };
        const nextStickyNotes = { ...prev.stickyNotes };
        delete nextTextNotes[absIndex];
        delete nextStickyNotes[absIndex];
        const next = normalizeAnnotations({
          ...prev,
          textNotes: nextTextNotes,
          stickyNotes: nextStickyNotes
        });
        autoSaveAnnotations(next);
        return next;
      });
      toast.success('Da xoa ghi chu tai vi tri nay.');
      return true;
    }

    return false;
  };

  const openHighlightMenu = (absIndex, e) => {
    const range = getHighlightRangeAt(absIndex);
    if (!range) return false;

    const rect = e.currentTarget.getBoundingClientRect();
    setHighlightMenu({
      visible: true,
      absIndex,
      range,
      x: rect.left + rect.width / 2,
      y: rect.top
    });
    setBubbleMenu(prev => ({ ...prev, visible: false }));
    return true;
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleWordPointerDown = (absIndex, e) => {
    clearLongPressTimer();

    if (showVisualReader && activeTool !== 'pencil' && activeTool !== 'eraser') {
      visualSelectionRef.current = {
        start: absIndex,
        end: absIndex,
        x: e.clientX,
        y: e.clientY,
        moved: false
      };
      setVisualSelectionRange({ start: absIndex, end: absIndex });
    }

    if (!annotations.highlights[absIndex]) return;

    longPressTimerRef.current = setTimeout(() => {
      openHighlightMenu(absIndex, e);
      longPressTimerRef.current = null;
    }, 450);
  };

  const handleWordPointerEnter = (absIndex, e) => {
    if (!showVisualReader || !visualSelectionRef.current || activeTool === 'pencil' || activeTool === 'eraser') return;
    if (e.buttons !== 1 && e.pointerType !== 'touch') return;

    visualSelectionRef.current.end = absIndex;
    visualSelectionRef.current.moved = visualSelectionRef.current.start !== absIndex;
    setVisualSelectionRange({
      start: visualSelectionRef.current.start,
      end: absIndex
    });
  };

  const finishVisualSelection = (absIndex, e) => {
    clearLongPressTimer();

    const selection = visualSelectionRef.current;
    visualSelectionRef.current = null;

    if (!showVisualReader || !selection || activeTool === 'pencil' || activeTool === 'eraser') {
      setVisualSelectionRange(null);
      return;
    }

    const clientX = e?.clientX ?? selection.x;
    const clientY = e?.clientY ?? selection.y;
    const end = Number.isFinite(absIndex) ? absIndex : selection.end;
    const dx = Math.abs(clientX - selection.x);
    const dy = Math.abs(clientY - selection.y);
    const isRangeSelection = selection.start !== end || selection.moved || dx > 8 || dy > 8;

    if (!isRangeSelection) {
      setVisualSelectionRange(null);
      return;
    }

    const start = Math.min(selection.start, end);
    const finish = Math.max(selection.start, end);
    const selectedText = getTextForRange(start, finish);
    ignoreNextWordClickRef.current = true;
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (activeTool === 'highlight') {
      createHighlightRange(start, finish, activeColor, selectedText);
      setVisualSelectionRange(null);
      return;
    }

    const targetRect = e?.currentTarget?.getBoundingClientRect?.();
    const selectedElements = Array.from(readerContainerRef.current?.querySelectorAll('[data-abs-index]') || [])
      .filter(el => {
        const idx = Number(el.getAttribute('data-abs-index'));
        return idx >= start && idx <= finish;
      });
    const firstRect = selectedElements[0]?.getBoundingClientRect?.();
    const lastRect = selectedElements[selectedElements.length - 1]?.getBoundingClientRect?.();
    const menuX = firstRect && lastRect ? (firstRect.left + lastRect.right) / 2 : targetRect ? targetRect.left + targetRect.width / 2 : clientX;
    const menuY = Math.max(10, firstRect ? firstRect.top - 50 : targetRect ? targetRect.top - 50 : clientY - 50);

    setBubbleMenu({
      visible: true,
      text: selectedText,
      startIndex: start,
      endIndex: finish,
      x: menuX,
      y: menuY
    });
    setHighlightMenu(prev => ({ ...prev, visible: false }));
    setVisualSelectionRange(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleWordPointerUp = (absIndex, e) => {
    finishVisualSelection(absIndex, e);
  };

  const handleSaveAnnotations = async () => {
    try {
      await saveDocumentAnnotations(id, JSON.stringify(normalizeAnnotations(annotations)));
      toast.success("Đã lưu toàn bộ ghi chú và nét vẽ thành công!");

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

  useEffect(() => {
    const handleGlobalPointerUp = (event) => {
      const selection = visualSelectionRef.current;
      if (!selection) return;

      const targetToken = window.document
        .elementsFromPoint(event.clientX, event.clientY)
        .map(el => el?.closest?.('[data-abs-index]'))
        .find(Boolean);
      const endIndex = targetToken ? Number(targetToken.getAttribute('data-abs-index')) : selection.end;
      finishVisualSelection(endIndex, event);
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [showVisualReader, activeTool, activeColor, annotations, segments]);

  const handleWordClick = async (word, absIndex, e) => {
    if (ignoreNextWordClickRef.current) {
      ignoreNextWordClickRef.current = false;
      return;
    }

    setVisualSelectionRange(null);
    const selection = window.getSelection().toString().trim();
    if (selection.length > 0) return;

    setHighlightMenu(prev => ({ ...prev, visible: false }));

    if (activeTool === 'eraser') {
      eraseAnnotationAt(absIndex);
      return;
    }

    // Highlight Tool Mode
    if (activeTool === 'highlight') {
      createHighlightRange(absIndex, absIndex, activeColor, word);
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

    if (annotations.highlights[absIndex]) {
      openHighlightMenu(absIndex, e);
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
    setHighlightMenu(prev => ({ ...prev, visible: false }));

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (!selectedText) {
      if (showVisualReader && (ignoreNextWordClickRef.current || bubbleMenu.visible)) return;
      setBubbleMenu(prev => ({ ...prev, visible: false }));
      return;
    }

    if (/^[\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A\u3001\uFF08\uFF09[\]{}""''\s]+$/u.test(selectedText)) return;

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const spans = readerContainerRef.current?.querySelectorAll('[data-abs-index]');
      if (!spans) return;

      const selectedIndexes = [];
      spans.forEach(span => {
        const intersects = typeof range.intersectsNode === 'function'
          ? range.intersectsNode(span)
          : selection.containsNode(span, true);
        if (intersects || selection.containsNode(span, true)) {
          const idx = Number(span.getAttribute('data-abs-index'));
          if (Number.isFinite(idx)) selectedIndexes.push(idx);
        }
      });

      if (selectedIndexes.length > 0) {
        const startIdx = Math.min(...selectedIndexes);
        const endIdx = Math.max(...selectedIndexes);
        if (activeTool === 'highlight') {
          createHighlightRange(startIdx, endIdx, activeColor, selectedText);
          selection.removeAllRanges();
        } else {
          const rect = range.getBoundingClientRect();
          setBubbleMenu({
            visible: true,
            text: selectedText,
            startIndex: startIdx,
            endIndex: endIdx,
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


  const validCurrentPage = showVisualReader ? currentPage : Math.min(currentPage, textTotalPages);
  const currentSegments = segments.slice((validCurrentPage - 1) * WORDS_PER_PAGE, validCurrentPage * WORDS_PER_PAGE);

  // Document selectors filtered list
  const filteredDropdownDocs = documentsList.filter(d =>
    d.title.toLowerCase().includes(docSearchQuery.toLowerCase())
  );
  const recentDropdownDocs = documentsList.slice(0, 4);

  // Count saved words in current document
  const savedWordsInDoc = vocabList.filter(w => String(w.documentId) === String(id)).length;
  const totalDocChars = segments.reduce((sum, s) => sum + (isStructureMarker(s) ? 0 : s.length), 0);
  const currentPageStrokes = annotations.pencilStrokes[currentPage] || [];
  const currentRedoStrokes = redoStrokes[currentPage] || [];

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

      {/* Highlight Action Menu */}
      {highlightMenu.visible && highlightMenu.range && (
        <div
          className="reader-highlight-menu fixed z-[110] w-[min(92vw,360px)] bg-white text-slate-800 rounded-2xl border border-slate-200 shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `${highlightMenu.x}px`,
            top: `${highlightMenu.y - 10}px`,
            transform: 'translate(-50%, -100%)'
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 mb-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Highlight</p>
              <p className="text-xs font-semibold text-slate-700 line-clamp-2 leading-relaxed">
                {highlightMenu.range.selectedText || segments[highlightMenu.absIndex]}
              </p>
            </div>
            <button
              onClick={() => setHighlightMenu(prev => ({ ...prev, visible: false }))}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0"
              aria-label="Dong menu highlight"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Doi mau</p>
              <div className="grid grid-cols-6 gap-2">
                {HIGHLIGHT_COLORS.map(color => (
                  <button
                    key={color.id}
                    onClick={() => updateHighlightColor(highlightMenu.range, color.value)}
                    className="w-10 h-10 rounded-xl border border-slate-200 shadow-sm hover:ring-2 hover:ring-blue-300 transition-all"
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                    aria-label={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  startEditingNote(
                    Number(highlightMenu.range.startOffset),
                    'text',
                    annotations.textNotes[highlightMenu.range.startOffset] || highlightMenu.range.noteContent || ''
                  );
                  setHighlightMenu(prev => ({ ...prev, visible: false }));
                }}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs font-bold flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>Ghi chu</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(highlightMenu.range.selectedText || segments[highlightMenu.absIndex] || '');
                  toast.success('Da sao chep noi dung highlight.');
                  setHighlightMenu(prev => ({ ...prev, visible: false }));
                }}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors text-xs font-bold flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                <span>Sao chep</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <div className="text-[10px] text-slate-400 leading-relaxed">
                {highlightMenu.range.createdAt ? (
                  <span>Tao: {new Date(highlightMenu.range.createdAt).toLocaleDateString('vi-VN')}</span>
                ) : (
                  <span>Highlight cu</span>
                )}
              </div>
              <button
                onClick={() => deleteHighlightRange(highlightMenu.range)}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-xs font-bold flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa</span>
              </button>
            </div>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[7px] border-transparent border-t-white" />
        </div>
      )}

      {/* Bubble Context Menu */}
      {bubbleMenu.visible && (
        <div
          className="reader-bubble-menu fixed z-[100] flex max-w-[calc(100vw-24px)] items-center gap-1 overflow-x-auto rounded-2xl border border-gray-800 bg-gray-950/95 p-1.5 text-[11px] text-white shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `${bubbleMenu.x}px`,
            top: `${bubbleMenu.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
          onMouseDown={(event) => event.preventDefault()}
        >
          <button
            onClick={handleBubbleSaveToFlashcard}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-center font-bold transition-colors hover:bg-white/10"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            <span>+ Flashcard</span>
          </button>
          <div className="h-4 w-px shrink-0 bg-white/20" />
          <button
            onClick={handleBubbleSaveToNotebook}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-center font-bold transition-colors hover:bg-white/10"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>+ Sổ tay</span>
          </button>
          <div className="h-4 w-px shrink-0 bg-white/20" />
          <button
            onClick={() => {
              createHighlightRange(bubbleMenu.startIndex, bubbleMenu.endIndex, activeColor, bubbleMenu.text);
              window.getSelection()?.removeAllRanges();
              setBubbleMenu(prev => ({ ...prev, visible: false }));
            }}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-center font-bold transition-colors hover:bg-white/10"
          >
            <Highlighter className="h-3.5 w-3.5" />
            <span>Highlight</span>
          </button>
          <div className="h-4 w-px shrink-0 bg-white/20" />
          <button
            onClick={() => {
              startEditingNote(bubbleMenu.startIndex, 'text', annotations.textNotes[bubbleMenu.startIndex]);
              setBubbleMenu(prev => ({ ...prev, visible: false }));
            }}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-center font-bold transition-colors hover:bg-white/10"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Ghi chú</span>
          </button>
          <div className="h-4 w-px shrink-0 bg-white/20" />
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
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-center font-bold transition-colors hover:bg-white/10"
          >
            <Search className="h-3.5 w-3.5 text-blue-300" />
            <span>Dịch nhanh</span>
          </button>
          <div className="h-4 w-px shrink-0 bg-white/20" />
          <button
            onClick={() => {
              navigator.clipboard.writeText(bubbleMenu.text);
              toast.success('Đã sao chép nội dung.');
              setBubbleMenu(prev => ({ ...prev, visible: false }));
            }}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-center font-bold transition-colors hover:bg-white/10"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Sao chép</span>
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-950" />
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
                    const nextRanges = { ...prev.highlightRanges };
                    Object.keys(nextRanges).forEach(rangeId => {
                      if (Number(nextRanges[rangeId].startOffset) === Number(editingNote.absIndex)) {
                        nextRanges[rangeId] = {
                          ...nextRanges[rangeId],
                          noteContent: '',
                          updatedAt: new Date().toISOString()
                        };
                      }
                    });
                    const next = normalizeAnnotations({ ...prev, [notesKey]: updatedNotes, highlightRanges: nextRanges });
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
                    const nextRanges = { ...prev.highlightRanges };
                    Object.keys(nextRanges).forEach(rangeId => {
                      if (Number(nextRanges[rangeId].startOffset) === Number(editingNote.absIndex)) {
                        nextRanges[rangeId] = {
                          ...nextRanges[rangeId],
                          noteContent: serializedNote,
                          updatedAt: new Date().toISOString()
                        };
                      }
                    });
                    const next = normalizeAnnotations({
                      ...prev,
                      highlightRanges: nextRanges,
                      [notesKey]: {
                        ...prev[notesKey],
                        [editingNote.absIndex]: serializedNote
                      }
                    });
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
        <div className={`${activeTheme.toolbar} px-2 sm:px-3 lg:px-4 py-2.5 sm:py-3 flex flex-col xl:flex-row gap-2 sm:gap-3 items-stretch xl:items-center justify-between shrink-0 shadow-sm transition-colors duration-250`}>
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
                  {!showVisualReader && textTotalPages > 1 && (
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
                          Trang {validCurrentPage} / {textTotalPages}
                        </span>

                        <button
                          onClick={() => {
                            setCurrentPage(p => Math.min(textTotalPages, p + 1));
                            readerContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={validCurrentPage === textTotalPages}
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
          <div className="mobile-scroll-x flex flex-nowrap sm:flex-wrap items-center justify-start gap-2 sm:gap-3 mt-1 xl:mt-0 pb-1">
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
          </div>
        </div>
      )}

      {/* Main Workspace Workspace Layout Grid */}
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-visible p-0 sm:gap-2 sm:p-2 lg:h-[calc(100vh-132px)] lg:flex-row lg:overflow-hidden">

        {/* Left pane: A4 Smart Reader Area */}
        <div
          className={`flex h-full min-h-0 flex-col transition-all duration-300 ease-in-out ${!isSidebarOpen
              ? 'w-full'
              : 'w-full lg:w-[calc(100%-clamp(340px,24vw,430px)-14px)]'
            }`}
        >
          <div className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white transition-colors duration-250 sm:rounded-3xl ${activeTheme.sheet}`}>
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
                <div className={`px-1.5 py-1.5 sm:px-3 sm:py-2 flex flex-col 2xl:flex-row 2xl:items-center gap-1.5 sm:gap-2 shrink-0 ${activeTheme.toolbar}`}>
                  <div className="w-full 2xl:w-auto overflow-x-auto scrollbar-thin">
                    <div className="inline-flex min-w-max items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 shadow-sm">
                    {/* Pointer */}
                    <button
                      onClick={() => {
                        setActiveTool('pointer');
                        setIsColorMenuOpen(false);
                      }}
                      className={`min-w-[44px] min-h-[44px] p-2 rounded-lg transition-all flex items-center justify-center ${activeTool === 'pointer' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      title="Con trỏ chuột tra cứu (Pointer)"
                    >
                      <MousePointer className="w-3.5 h-3.5" />
                    </button>

                    {/* Highlight Dropdown */}
                    <div className="relative group">
                      <button
                        onClick={() => {
                          setActiveTool('highlight');
                          setIsColorMenuOpen(prev => !prev);
                        }}
                        className={`min-w-[44px] min-h-[44px] p-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTool === 'highlight' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        title="Bôi màu Highlight văn bản (H)"
                      >
                        <Highlighter className="w-3.5 h-3.5" />
                        <span
                          className="w-3 h-3 rounded-full border border-slate-350 inline-block shadow-sm"
                          style={{ backgroundColor: activeColor }}
                        />
                      </button>
                      <div className="hidden">
                        {HIGHLIGHT_COLORS.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setActiveColor(c.value);
                              setActiveTool('highlight');
                              setIsColorMenuOpen(false);
                            }}
                            className="min-h-[40px] flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 w-full transition-colors"
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
                      onClick={() => {
                        setActiveTool('pencil');
                        setIsColorMenuOpen(false);
                      }}
                      className={`min-w-[44px] min-h-[44px] p-2 rounded-lg transition-all flex items-center justify-center ${activeTool === 'pencil' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      title="Viết vẽ tay (Pencil)"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Eraser */}
                    <button
                      onClick={() => {
                        setActiveTool('eraser');
                        setIsColorMenuOpen(false);
                      }}
                      className={`min-w-[44px] min-h-[44px] p-2 rounded-lg transition-all flex items-center justify-center ${activeTool === 'eraser' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      title="Tẩy nét vẽ (Eraser)"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                    </button>

                    {/* Text Note */}
                    <button
                      onClick={() => {
                        setActiveTool('textNote');
                        setIsColorMenuOpen(false);
                      }}
                      className={`min-w-[44px] min-h-[44px] p-2 rounded-lg transition-all flex items-center justify-center ${activeTool === 'textNote' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      title="Thêm Ghi chú văn bản (Text Note)"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>

                    {/* Sticky Note */}
                    <button
                      onClick={() => {
                        setActiveTool('stickyNote');
                        setIsColorMenuOpen(false);
                      }}
                      className={`min-w-[44px] min-h-[44px] p-2 rounded-lg transition-all flex items-center justify-center ${activeTool === 'stickyNote' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      title="Thêm Ghi chú nổi (Sticky Note)"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    </div>
                  </div>

                  {activeTool === 'highlight' && isColorMenuOpen && (
                    <div className="w-full 2xl:flex-1 min-w-0 bg-white border border-slate-200/80 rounded-2xl px-3 py-2 shadow-sm">
                      <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
                        <Palette className="w-4 h-4 text-slate-400 shrink-0" />
                        {HIGHLIGHT_COLORS.map(color => (
                          <button
                            key={color.id}
                            onClick={() => {
                              setActiveColor(color.value);
                              setActiveTool('highlight');
                              setIsColorMenuOpen(false);
                            }}
                            className={`min-w-[44px] min-h-[44px] rounded-xl border transition-all flex items-center justify-center ${activeColor === color.value ? 'ring-2 ring-blue-500 ring-offset-2 border-white' : 'border-slate-200 hover:ring-2 hover:ring-slate-300'}`}
                            title={color.name}
                            aria-label={color.name}
                          >
                            <span
                              className="w-7 h-7 rounded-full border border-slate-200 shadow-sm"
                              style={{ backgroundColor: color.value }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTool === 'pencil' && (
                    <div className="w-full 2xl:flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[minmax(210px,1fr)_auto] xl:grid-cols-[minmax(220px,1fr)_auto_auto_auto] items-center gap-2 bg-white border border-slate-200/80 rounded-2xl px-2 sm:px-3 py-2 shadow-sm">
                      <div className="min-w-0 flex items-center gap-1 overflow-x-auto scrollbar-thin md:pr-2 md:border-r md:border-slate-200">
                        <Palette className="w-3.5 h-3.5 text-slate-400" />
                        {DRAWING_COLORS.map(color => (
                          <button
                            key={color.id}
                            onClick={() => setPenColor(color.value)}
                            className={`w-8 h-8 rounded-full border transition-all ${penColor === color.value ? 'ring-2 ring-blue-500 ring-offset-2 border-white' : 'border-slate-200 hover:ring-2 hover:ring-slate-300'}`}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                            aria-label={color.name}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin md:pr-2 md:border-r md:border-slate-200">
                        {PEN_WIDTHS.map(width => (
                          <button
                            key={width.value}
                            onClick={() => setPenWidth(width.value)}
                            className={`min-w-[40px] min-h-[36px] px-2 rounded-xl text-[11px] font-black transition-all ${penWidth === width.value ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                            title={`Do day ${width.label}`}
                          >
                            {width.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1 md:pr-2 md:border-r md:border-slate-200">
                        <Type className="w-3.5 h-3.5 text-slate-400" />
                        <select
                          value={penStyle}
                          onChange={(e) => setPenStyle(e.target.value)}
                          className="min-h-[40px] bg-slate-50 border border-slate-200 rounded-xl px-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                          title="Kieu net"
                        >
                          {PEN_STYLES.map(style => (
                            <option key={style.id} value={style.id}>{style.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1 justify-start md:justify-end">
                        <button
                          onClick={handleUndoStroke}
                          disabled={currentPageStrokes.length === 0}
                          className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-all"
                          title="Undo net ve"
                        >
                          <Undo2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleRedoStroke}
                          disabled={currentRedoStrokes.length === 0}
                          className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed transition-all"
                          title="Redo net ve"
                        >
                          <Redo2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex w-full items-center justify-end gap-2 overflow-x-auto scrollbar-thin 2xl:w-auto 2xl:overflow-visible">
                    <button
                      onClick={handleSaveAnnotations}
                      className="min-h-[40px] min-w-[44px] sm:min-h-[44px] sm:min-w-[150px] flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/10 active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Lưu ghi chú</span>
                    </button>
                    <button
                      onClick={handleExportDocx}
                      className="min-h-[40px] min-w-[44px] sm:min-h-[44px] sm:min-w-[170px] flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-500" />
                      <span className="hidden sm:inline">Xuất Word (.docx)</span>
                    </button>
                  </div>
                </div>

                {/* Reader page content */}
                <div className={`flex-grow flex flex-col mx-auto w-full overflow-hidden ${showVisualReader ? 'max-w-none p-0' : 'max-w-5xl pt-3 sm:pt-4 pb-3 px-3 sm:px-6 xl:px-10'} ${activeTheme.sheet}`}>
                  {!showVisualReader && (
                    <h1 className="text-lg sm:text-xl font-black mb-3 text-center leading-snug shrink-0 break-all border-b pb-3 border-slate-100/55">{document.title}</h1>
                  )}

                  <div
                    ref={readerContainerRef}
                    className={`min-h-0 flex-1 overflow-y-auto scrollbar-thin ${showVisualReader ? 'p-0' : `break-words pr-1 sm:pr-3 select-text ${fontStyles[fontMode]}`}`}
                    style={showVisualReader ? undefined : { fontSize: `clamp(18px, ${fontSize}px, 32px)`, lineHeight: '1.9', wordSpacing: '0', letterSpacing: '0.01em' }}
                    onMouseUp={handleTextSelection}
                  >
                    <div className="relative min-h-full">
                      {/* Drawing canvas layer */}
                      {!showVisualReader && (
                        <canvas
                          ref={canvasRef}
                          className={`absolute inset-0 z-10 w-full h-full ${(activeTool === 'pencil' || activeTool === 'eraser') ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
                          style={{ touchAction: (activeTool === 'pencil' || activeTool === 'eraser') ? 'none' : 'auto' }}
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerLeave={handlePointerUp}
                        />
                      )}

                      {/* CJK segment mapping render — grouped by paragraph / line */}
                      <div className={`relative z-0 ${showVisualReader ? 'pb-0 pr-0' : 'pb-12 pr-2'}`}>
                        {documentError ? (
                          <div className="mx-auto mt-10 flex max-w-xl flex-col items-center justify-center rounded-3xl border border-red-100 bg-red-50/80 px-6 py-10 text-center">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-red-500 shadow-sm">
                              <FileText className="h-7 w-7" />
                            </div>
                            <h2 className="text-lg font-black text-slate-900">Không thể hiển thị tài liệu</h2>
                            <p className="mt-3 text-sm font-semibold leading-6 text-red-700">{documentError}</p>
                            <button
                              type="button"
                              onClick={() => setIsUploadModalOpen(true)}
                              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
                            >Tải tài liệu khác</button>
                          </div>
                        ) : showVisualReader ? (
                          <div className="h-full min-h-[calc(100svh-255px)] lg:min-h-0">
                            <VisualDocumentReader
                              documentId={document.id || document.Id || id}
                              fileUrl={document.fileUrl || document.FileUrl}
                              fileType={visualDocumentType}
                              ocrJsonUrl={visualOcrJsonUrl}
                              showPinyin={showPinyin}
                              activeTool={activeTool}
                              activeColor={activeColor}
                              annotations={annotations}
                              selectionRange={visualSelectionRange}
                              currentPage={currentPage}
                              onPageChange={setCurrentPage}
                              drawingCanvasRef={canvasRef}
                              onDrawingPointerDown={handlePointerDown}
                              onDrawingPointerMove={handlePointerMove}
                              onDrawingPointerUp={handlePointerUp}
                              onWordClick={handleWordClick}
                              onWordPointerDown={handleWordPointerDown}
                              onWordPointerEnter={handleWordPointerEnter}
                              onWordPointerUp={handleWordPointerUp}
                              onWordPointerCancel={clearLongPressTimer}
                              onWordPointerLeave={clearLongPressTimer}
                              onHighlightContextMenu={openHighlightMenu}
                              onWordMouseEnter={handleWordMouseEnter}
                              onWordMouseLeave={handleWordMouseLeave}
                            />
                          </div>
                        ) : (() => {
                          // Pre-group segments into paragraphs / lines while tracking absIndex
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
                               : "mb-2.5 text-slate-800 leading-relaxed";

                            return (
                            <div key={pi} className={paraClass}>
                              {lines.map((lineWords, li) => (
                                <div key={li} className={`flex flex-wrap leading-tight mb-0.5 ${isHeading ? 'mb-1.5' : ''} ${isCenter ? 'justify-center' : ''} ${(isIndent && li === 0 && !isHeading && !isCenter) ? 'pl-10' : ''}`}>
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
                                        onPointerDown={(e) => handleWordPointerDown(absIndex, e)}
                                        onPointerUp={clearLongPressTimer}
                                        onPointerCancel={clearLongPressTimer}
                                        onPointerLeave={clearLongPressTimer}
                                        onContextMenu={(e) => {
                                          if (annotations.highlights[absIndex]) {
                                            e.preventDefault();
                                            openHighlightMenu(absIndex, e);
                                          }
                                        }}
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
                  {!showVisualReader && textTotalPages > 1 && (
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
                          Trang {validCurrentPage} / {textTotalPages}
                        </span>

                        <button
                          onClick={() => {
                            setCurrentPage(p => Math.min(textTotalPages, p + 1));
                            readerContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={validCurrentPage === textTotalPages}
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
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] z-[60] lg:hidden"
          />
        )}

        {/* Right pane: Collapsible Responsive Sidebar */}
        {document && (
          <div
            className={`bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col shrink-0 transition-all duration-300 ease-in-out z-[70] ${isSidebarOpen
                ? 'fixed inset-x-2 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] top-auto h-[min(66vh,620px)] max-h-[calc(100svh-7rem)] w-auto rounded-2xl translate-y-0 sm:inset-x-auto sm:right-4 sm:w-[420px] lg:fixed lg:right-2 lg:top-[var(--reader-sidebar-top)] lg:bottom-[var(--reader-sidebar-bottom)] lg:h-auto lg:min-h-0 lg:max-h-none lg:w-[clamp(340px,24vw,430px)] lg:min-w-0 lg:max-w-none lg:rounded-3xl'
                : 'fixed inset-x-2 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] top-auto h-[min(66vh,620px)] max-h-[calc(100svh-7rem)] w-auto rounded-2xl translate-y-[calc(100%+6rem)] sm:inset-x-auto sm:right-4 sm:w-[420px] lg:hidden lg:translate-y-0'
              }`}
            style={{ '--reader-sidebar-top': `${readerSidebarTop}px`, '--reader-sidebar-bottom': `${readerSidebarBottom}px` }}
          >
            {/* Sidebar Tab Header */}
            <div className="flex border-b border-slate-150 bg-slate-50/50 shrink-0">
              <button
                onClick={() => setSidebarTab('dict')}
                className={`flex-1 py-2.5 text-[11px] sm:py-3.5 sm:text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${sidebarTab === 'dict'
                    ? 'border-blue-600 text-blue-600 bg-white font-extrabold shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Từ điển</span>
              </button>
              <button
                onClick={() => setSidebarTab('chat')}
                className={`flex-1 py-2.5 text-[11px] sm:py-3.5 sm:text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${sidebarTab === 'chat'
                    ? 'border-blue-600 text-blue-600 bg-white font-extrabold shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Trợ lý AI</span>
              </button>
              <button
                onClick={() => setSidebarTab('stats')}
                className={`flex-1 py-2.5 text-[11px] sm:py-3.5 sm:text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${sidebarTab === 'stats'
                    ? 'border-blue-600 text-blue-600 bg-white font-extrabold shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Tiến trình</span>
              </button>
            </div>

            {/* Sidebar Tab Content panels */}
            <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin sm:p-5">

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
