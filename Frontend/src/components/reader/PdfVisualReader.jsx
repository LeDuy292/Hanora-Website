import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Loader2, Maximize2, Minimize2, Minus, Plus } from 'lucide-react';
import { segmentChineseText, cleanPinyin, CHINESE_DICTIONARY } from '../../utils/chineseUtils';
import { pinyin } from 'pinyin-pro';

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const clampScale = (value) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

// Global in-memory cache for OCR layouts to avoid re-fetching 6MB JSONs
const ocrLayoutMemoryCache = new Map();

const normalizePages = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.pages)) return payload.pages;
  if (Array.isArray(payload.Pages)) return payload.Pages;
  return [];
};

const valueOf = (obj, camel, pascal, fallback = undefined) => obj?.[camel] ?? obj?.[pascal] ?? fallback;

const getBox = (box) => {
  if (!box) return null;
  const x = Number(valueOf(box, 'x', 'X', 0));
  const y = Number(valueOf(box, 'y', 'Y', 0));
  const width = Number(valueOf(box, 'width', 'Width', 0));
  const height = Number(valueOf(box, 'height', 'Height', 0));
  if (!Number.isFinite(x) || !Number.isFinite(y) || width <= 0 || height <= 0) return null;
  return { x, y, width, height };
};

const HANZI_RE = /[\u3400-\u9fff]/;
const VIETNAMESE_RE = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const CJK_OR_DIGIT_RE = /[\u3400-\u9fff0-9]/;

const hasTargetText = (text = '') => {
  if (!text) return false;
  if (VIETNAMESE_RE.test(text)) return false;
  return CJK_OR_DIGIT_RE.test(text);
};

const hasHanzi = (text = '') => HANZI_RE.test(text);

const measureTextUnits = (text = '') => {
  const chars = Array.from(text);
  if (!chars.length) return 1;

  return chars.reduce((total, char) => {
    if (/\s/.test(char)) return total + 0.95;
    if (HANZI_RE.test(char)) return total + 1;
    if (/[A-Za-z0-9]/.test(char)) return total + 0.62;
    return total + 0.42;
  }, 0) || 1;
};

const segmentPdfHitText = (text = '') => {
  if (!text) return [];

  const tokens = segmentChineseText(text).map((token) => ({
    text: token.text,
    isWord: Boolean(token.isWord) || hasHanzi(token.text),
  }));

  const mergedTokens = [];
  let idx = 0;
  while (idx < tokens.length) {
    if (idx < tokens.length - 1 && tokens[idx].text.length === 1 && tokens[idx + 1].text.length === 1) {
      const combo = tokens[idx].text + tokens[idx + 1].text;
      if (CHINESE_DICTIONARY[combo]) {
        mergedTokens.push({
          text: combo,
          isWord: true
        });
        idx += 2;
        continue;
      }
    }
    mergedTokens.push(tokens[idx]);
    idx++;
  }

  return mergedTokens;
};

const fitTextBoxToContent = (text, box, pageWidth) => {
  if (!box) return null;

  const units = measureTextUnits(text);
  const hasCJK = hasHanzi(text);
  const scaleFactor = hasCJK ? 1.02 : 1.12;
  const expectedWidth = Math.max(box.height * units * scaleFactor, box.height * 0.8);
  const availableWidth = pageWidth ? Math.max(1, pageWidth - box.x) : box.width;
  const maxAllowedWidth = Math.min(availableWidth, expectedWidth * 1.15);

  if (box.width > maxAllowedWidth) {
    return {
      ...box,
      width: Math.max(1, maxAllowedWidth),
    };
  }

  return box;
};

const fitTokenBoxWidth = (token, sourceBox, allocatedWidth) => {
  if (!token?.text || !sourceBox) {
    return Math.max(1, allocatedWidth);
  }

  const units = measureTextUnits(token.text);
  const hasCJK = hasHanzi(token.text);
  const scaleFactor = hasCJK ? 1.02 : 1.7;
  const expectedWidth = sourceBox.height * units * scaleFactor;
  return Math.min(allocatedWidth, expectedWidth);
};

const splitTextBoxIntoHitWords = (text, box, keyPrefix) => {
  const tokens = segmentPdfHitText(text);
  if (!tokens.length || !box) return [];

  const tokenUnits = tokens.map((token) => measureTextUnits(token.text));
  const totalUnits = tokenUnits.reduce((sum, units) => sum + units, 0) || 1;
  let cursorUnits = 0;

  return tokens.flatMap((token, tokenIndex) => {
    const units = tokenUnits[tokenIndex] || 1;
    const left = box.x + (cursorUnits / totalUnits) * box.width;
    const allocatedWidth = Math.max(1, (units / totalUnits) * box.width);
    const width = fitTokenBoxWidth(token, box, allocatedWidth);
    cursorUnits += units;

    if (!token.text || !token.text.trim()) return [];

    return [{
      key: keyPrefix + '-' + tokenIndex + '-' + token.text,
      text: token.text,
      box: {
        x: left,
        y: box.y,
        width,
        height: box.height,
      },
    }];
  });
};

const countHanzi = (text = '') => Array.from(text).filter((char) => HANZI_RE.test(char)).length;

const isSuspiciousWordBox = (text, box, lineBox) => {
  if (!text || !box || !hasHanzi(text)) return false;

  const hanziCount = Math.max(1, countHanzi(text));
  const expectedMaxWidth = Math.max(box.height * hanziCount * 1.48, box.height * 1.8);

  if (box.width > expectedMaxWidth) return true;
  if (lineBox && hanziCount <= 2 && box.width > lineBox.width * 0.4) return true;

  return false;
};

const shouldSplitFromLineBox = (lineText, lineBox, words) => {
  if (!lineText || !lineBox) return false;
  if (!Array.isArray(words) || words.length === 0) return true;

  const wordBoxes = words
    .map((word) => ({
      text: valueOf(word, 'text', 'Text', ''),
      box: getBox(valueOf(word, 'boundingBox', 'BoundingBox')),
    }))
    .filter((word) => word.text && word.box);

  if (!wordBoxes.length) return true;

  const sortedWords = [...wordBoxes].sort((a, b) => a.box.x - b.box.x);
  for (let i = 0; i < sortedWords.length - 1; i++) {
    const current = sortedWords[i];
    const next = sortedWords[i + 1];
    if (next.box.x < current.box.x + current.box.width - 2) {
      return true;
    }
  }

  const hanziWords = wordBoxes.filter((word) => hasHanzi(word.text));
  if (!hanziWords.length) return false;

  const suspiciousCount = hanziWords.filter((word) => isSuspiciousWordBox(word.text, word.box, lineBox)).length;
  return suspiciousCount > 0;
};

const getWordsFromLine = (line, lineIndex, pageWidth) => {
  const lineText = valueOf(line, 'text', 'Text', '');
  const lineBox = getBox(valueOf(line, 'boundingBox', 'BoundingBox'));
  const rawWords = valueOf(line, 'words', 'Words', []);

  if (!lineText) return [];

  const tokens = segmentPdfHitText(lineText);
  if (!tokens.length) return [];

  const validWordBoxes = Array.isArray(rawWords)
    ? rawWords
      .map((w) => ({
        text: valueOf(w, 'text', 'Text', ''),
        box: fitTextBoxToContent(valueOf(w, 'text', 'Text', ''), getBox(valueOf(w, 'boundingBox', 'BoundingBox')), pageWidth)
      }))
      .filter((w) => w.text && w.box)
    : [];

  if (validWordBoxes.length > 0) {
    const resultWords = [];
    let boxIdx = 0;

    for (let tIdx = 0; tIdx < tokens.length; tIdx++) {
      const token = tokens[tIdx];
      const tokenText = token.text;

      let accumulatedText = '';
      const matchedBoxes = [];

      while (boxIdx < validWordBoxes.length && accumulatedText.length < tokenText.length) {
        const w = validWordBoxes[boxIdx];
        accumulatedText += w.text;
        matchedBoxes.push(w.box);
        boxIdx++;
      }

      if (matchedBoxes.length > 0) {
        const minX = Math.min(...matchedBoxes.map((b) => b.x));
        const minY = Math.min(...matchedBoxes.map((b) => b.y));
        const maxX = Math.max(...matchedBoxes.map((b) => b.x + b.width));
        const maxY = Math.max(...matchedBoxes.map((b) => b.y + b.height));

        resultWords.push({
          key: `${lineIndex}-${tIdx}-${tokenText}`,
          text: tokenText,
          box: {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
          }
        });
      }
    }

    if (resultWords.length > 0) {
      return resultWords;
    }
  }

  const fittedLineBox = fitTextBoxToContent(lineText, lineBox, pageWidth);
  return splitTextBoxIntoHitWords(lineText, fittedLineBox, `${lineIndex}-line`);
};

const getWords = (page) => {
  const lines = valueOf(page, 'lines', 'Lines', []);
  const pageWidth = Number(valueOf(page, 'width', 'Width', 0)) || null;

  return lines.flatMap((line, lineIndex) => {
    return getWordsFromLine(line, lineIndex, pageWidth);
  }).filter((word) => word.text && word.box && hasTargetText(word.text));
};

const getPageIdentity = (page, index) => {
  const explicit = valueOf(page, 'pageNumber', 'PageNumber', valueOf(page, 'page', 'Page', index + 1));
  const numeric = Number(explicit);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : index + 1;
};

const withPageIdentity = (page, pageNumber) => ({
  ...page,
  pageNumber: Number(valueOf(page, 'pageNumber', 'PageNumber', pageNumber)) || pageNumber,
});

const PdfVisualReader = ({
  documentId,
  fileUrl,
  ocrJsonUrl,
  currentPage = 1,
  onPageChange,
  onWordClick,
  showPinyin = false,
  activeTool = 'pointer',
  annotations = {},
  selectionRange = null,
  drawingCanvasRef,
  onDrawingPointerDown,
  onDrawingPointerMove,
  onDrawingPointerUp,
  onWordPointerDown,
  onWordPointerEnter,
  onWordPointerUp,
  onWordPointerCancel,
  onWordPointerLeave,
  onHighlightContextMenu,
  onWordMouseEnter,
  onWordMouseLeave,
}) => {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [scale, setScale] = useState(1.25);
  const [fitMode, setFitMode] = useState('width');
  const [pageInput, setPageInput] = useState('1');
  const [basePageSize, setBasePageSize] = useState({ width: 0, height: 0 });
  const [ocrPages, setOcrPages] = useState([]);
  const [isLoadingOcr, setIsLoadingOcr] = useState(Boolean(ocrJsonUrl));
  const [isFullscreen, setIsFullscreen] = useState(false);

  const readerRootRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const renderTaskRef = useRef(null);
  const requestedOcrPagesRef = useRef(new Set());

  const pageNumber = Math.max(1, Math.min(Number(currentPage) || 1, totalPages || Number(currentPage) || 1));
  const zoomPercent = Math.round(scale * 100);

  useEffect(() => {
    setPageInput(String(pageNumber));
  }, [pageNumber]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === readerRootRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      )) {
        return;
      }

      if (event.key === 'ArrowRight') {
        const bounded = Math.max(1, Math.min(pageNumber + 1, totalPages || 1));
        onPageChange?.(bounded);
        event.preventDefault();
      } else if (event.key === 'ArrowLeft') {
        const bounded = Math.max(1, Math.min(pageNumber - 1, totalPages || 1));
        onPageChange?.(bounded);
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNumber, totalPages, onPageChange]);

  useEffect(() => {
    if (fitMode === 'custom' || !basePageSize.width || !basePageSize.height || !scrollAreaRef.current) return undefined;

    const updateFitScale = () => {
      const viewport = scrollAreaRef.current;
      if (!viewport) return;

      const availableWidth = Math.max(240, viewport.clientWidth - 24);
      const availableHeight = Math.max(240, viewport.clientHeight - 24);
      const widthScale = availableWidth / basePageSize.width;
      const pageScale = Math.min(widthScale, availableHeight / basePageSize.height);
      const nextScale = fitMode === 'page' ? pageScale : widthScale;
      setScale(clampScale(nextScale));
    };

    updateFitScale();
    const resizeObserver = new ResizeObserver(updateFitScale);
    resizeObserver.observe(scrollAreaRef.current);
    window.addEventListener('resize', updateFitScale);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateFitScale);
    };
  }, [fitMode, basePageSize.width, basePageSize.height]);
  const ocrPage = useMemo(() => {
    if (!ocrPages.length) return null;

    return ocrPages.find((page, index) => getPageIdentity(page, index) === pageNumber) || null;
  }, [ocrPages, pageNumber]);

  const hasOcrPageForCurrentPage = useMemo(() => (
    ocrPages.some((page, index) => getPageIdentity(page, index) === pageNumber)
  ), [ocrPages, pageNumber]);

  useEffect(() => {
    requestedOcrPagesRef.current.clear();
  }, [documentId, fileUrl]);

// Global in-memory & session storage cache for OCR layouts to avoid re-fetching 6MB JSONs
const ocrLayoutMemoryCache = new Map();

  useEffect(() => {
    let isMounted = true;
    if (!ocrJsonUrl) {
      setOcrPages([]);
      setIsLoadingOcr(false);
      return undefined;
    }

    // 1. Check in-memory cache first for instant 0ms load
    if (ocrLayoutMemoryCache.has(ocrJsonUrl)) {
      setOcrPages(ocrLayoutMemoryCache.get(ocrJsonUrl));
      setIsLoadingOcr(false);
      return undefined;
    }

    // 2. Check sessionStorage cache
    try {
      const cached = sessionStorage.getItem(`hanora_ocr_${ocrJsonUrl}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const normalized = normalizePages(parsed);
        ocrLayoutMemoryCache.set(ocrJsonUrl, normalized);
        setOcrPages(normalized);
        setIsLoadingOcr(false);
        return undefined;
      }
    } catch {
      // Ignore storage errors
    }

    setIsLoadingOcr(true);
    fetch(ocrJsonUrl, { cache: 'force-cache' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Cannot load OCR layout')))
      .then((payload) => {
        const normalized = normalizePages(payload);
        ocrLayoutMemoryCache.set(ocrJsonUrl, normalized);
        try {
          sessionStorage.setItem(`hanora_ocr_${ocrJsonUrl}`, JSON.stringify(payload));
        } catch {
          // Ignore quota exceeded
        }
        if (isMounted) setOcrPages(normalized);
      })
      .catch((error) => {
        console.warn('Cannot load PDF OCR layout.', error);
        if (isMounted) setOcrPages([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingOcr(false);
      });

    return () => { isMounted = false; };
  }, [ocrJsonUrl]);

  const [loadProgress, setLoadProgress] = useState(0);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!fileUrl) return undefined;
    let cancelled = false;
    setLoadError(null);
    setLoadProgress(0);

    const loadPdf = async () => {
      try {
        const pdfjsLib = window.pdfjsLib;
        if (!pdfjsLib) {
          console.error('PDF.js not loaded.');
          return;
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';

        // Optimized streaming configuration for S3 PDFs
        const loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
          disableAutoFetch: false,
          disableStream: false,
          rangeChunkSize: 1048576 * 4, // 4MB chunk streaming (64x faster than 64KB)
        });

        loadingTask.onProgress = ({ loaded, total }) => {
          if (total > 0 && !cancelled) {
            setLoadProgress(Math.min(99, Math.round((loaded / total) * 100)));
          }
        };

        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading PDF:', error);
          setLoadError(error.message || 'Không thể tải PDF');
        }
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [fileUrl]);

  const attachWordHandlers = (wordSpan, word, absIndex) => {
    wordSpan.onclick = (event) => {
      event.stopPropagation();
      onWordClick?.(word, absIndex, event);
    };
    wordSpan.onpointerdown = (event) => onWordPointerDown?.(absIndex, event);
    wordSpan.onpointerenter = (event) => onWordPointerEnter?.(absIndex, event);
    wordSpan.onpointerup = (event) => onWordPointerUp?.(absIndex, event);
    wordSpan.onpointercancel = onWordPointerCancel || null;
    wordSpan.onpointerleave = onWordPointerLeave || null;
    wordSpan.onmouseenter = (event) => onWordMouseEnter?.(absIndex, event);
    wordSpan.onmouseleave = onWordMouseLeave || null;
    wordSpan.oncontextmenu = (event) => {
      if (annotations?.highlights?.[absIndex]) {
        event.preventDefault();
        onHighlightContextMenu?.(absIndex, event);
      }
    };
  };

  const decorateWordSpan = (wordSpan, word, absIndex) => {
    const highlightColor = annotations?.highlights?.[absIndex];
    const hasTextNote = annotations?.textNotes?.[absIndex];
    const hasStickyNote = annotations?.stickyNotes?.[absIndex];

    wordSpan.dataset.absIndex = String(absIndex);
    wordSpan.dataset.pageNumber = String(pageNumber);
    wordSpan.classList.add('hanora-pdf-token');
    wordSpan.style.cursor = 'pointer';
    wordSpan.style.transition = 'background 150ms ease, box-shadow 150ms ease, outline 150ms ease';

    const rangeStart = selectionRange ? Math.min(selectionRange.start, selectionRange.end) : -1;
    const rangeEnd = selectionRange ? Math.max(selectionRange.start, selectionRange.end) : -1;
    const isSelecting = absIndex >= rangeStart && absIndex <= rangeEnd;

    if (highlightColor) {
      wordSpan.style.backgroundColor = `${highlightColor}73`;
      wordSpan.style.boxShadow = 'inset 0 -0.08em 0 rgba(15, 23, 42, 0.08)';
      wordSpan.style.borderRadius = '3px';
    } else if (isSelecting) {
      wordSpan.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
      wordSpan.style.outline = 'none';
      const isFirst = absIndex === rangeStart;
      const isLast = absIndex === rangeEnd;
      if (isFirst && isLast) {
        wordSpan.style.borderRadius = '3px';
      } else if (isFirst) {
        wordSpan.style.borderRadius = '3px 0 0 3px';
      } else if (isLast) {
        wordSpan.style.borderRadius = '0 3px 3px 0';
      } else {
        wordSpan.style.borderRadius = '0';
      }
    } else {
      wordSpan.style.borderRadius = '3px';
    }

    if (hasTextNote || hasStickyNote) {
      const noteBadge = document.createElement('span');
      noteBadge.textContent = hasStickyNote ? '📌' : '💡';
      noteBadge.className = 'hanora-note-badge';
      noteBadge.title = hasStickyNote || hasTextNote || '';
      wordSpan.appendChild(noteBadge);
    }

    if (showPinyin && hasHanzi(word)) {
      const pinyinLabel = document.createElement('span');
      pinyinLabel.textContent = cleanPinyin(word, pinyin(word, { type: 'string' }));
      pinyinLabel.className = 'hanora-pinyin-label';
      wordSpan.appendChild(pinyinLabel);
    }
  };

  const renderOcrOverlay = (textLayerDiv, page, viewport) => {
    const words = getWords(page);
    if (!words.length) return false;

    textLayerDiv.innerHTML = '';
    textLayerDiv.style.height = `${viewport.height}px`;
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.setProperty('--scale-factor', scale);

    const pageWidth = Number(valueOf(page, 'width', 'Width', viewport.width)) || viewport.width || 1;
    const pageHeight = Number(valueOf(page, 'height', 'Height', viewport.height)) || viewport.height || 1;

    words.forEach((word, wordIndex) => {
      const absIndex = (pageNumber - 1) * 10000 + wordIndex;
      const span = document.createElement('span');
      span.textContent = word.text;
      span.className = 'hanora-pdf-ocr-word';

      const viewX = (word.box.x / pageWidth) * viewport.width;
      const viewY = (word.box.y / pageHeight) * viewport.height;
      const spanWidth = Math.max(1, (word.box.width / pageWidth) * viewport.width);
      const spanHeight = Math.max(1, (word.box.height / pageHeight) * viewport.height);

      span.style.left = `${viewX}px`;
      span.style.top = `${viewY}px`;
      span.style.width = `${spanWidth}px`;
      span.style.height = `${spanHeight}px`;
      span.style.fontSize = `${Math.max(10, spanHeight * 0.90)}px`;
      decorateWordSpan(span, word.text, absIndex);
      attachWordHandlers(span, word.text, absIndex);
      textLayerDiv.appendChild(span);
    });

    return true;
  };

  const processPdfTextLayerForClick = (textLayerDiv) => {
    const spans = textLayerDiv.querySelectorAll('span');
    let tokenIndex = 0;

    spans.forEach((span) => {
      const text = span.textContent;
      if (!text || text.trim() === '') return;

      const tokens = segmentChineseText(text);
      span.textContent = '';

      tokens.forEach((token) => {
        const wordSpan = document.createElement('span');
        wordSpan.textContent = token.text;

        if (token.text && token.text.trim() !== '') {
          const absIndex = (pageNumber - 1) * 10000 + tokenIndex;
          decorateWordSpan(wordSpan, token.text, absIndex);
          attachWordHandlers(wordSpan, token.text, absIndex);
          tokenIndex += 1;
        }

        span.appendChild(wordSpan);
      });
    });
  };

  useEffect(() => {
    const layer = textLayerRef.current;
    if (!layer) return;

    const rangeStart = selectionRange ? Math.min(selectionRange.start, selectionRange.end) : -1;
    const rangeEnd = selectionRange ? Math.max(selectionRange.start, selectionRange.end) : -1;

    layer.querySelectorAll('[data-abs-index]').forEach((element) => {
      const index = Number(element.getAttribute('data-abs-index'));
      element.classList.toggle('hanora-token-selecting', index >= rangeStart && index <= rangeEnd);
    });
  }, [selectionRange]);

  useEffect(() => {
    if (!pdfDoc) return undefined;
    let cancelled = false;

    const renderPage = async () => {
      setIsRendering(true);

      try {
        const page = await pdfDoc.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        setBasePageSize((prev) => (
          Math.abs(prev.width - baseViewport.width) > 0.5 || Math.abs(prev.height - baseViewport.height) > 0.5
            ? { width: baseViewport.width, height: baseViewport.height }
            : prev
        ));
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const textLayerDiv = textLayerRef.current;
        if (!canvas || !textLayerDiv) return;

        textLayerDiv.innerHTML = '';
        const context = canvas.getContext('2d', { willReadFrequently: true });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (drawingCanvasRef?.current) {
          drawingCanvasRef.current.height = viewport.height;
          drawingCanvasRef.current.width = viewport.width;
          drawingCanvasRef.current.dataset.pageNumber = String(pageNumber);
        }

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const task = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = task;
        await task.promise;
        if (cancelled) return;

        const textContent = await page.getTextContent();
        const nativeText = textContent?.items?.map(item => item.str || '').join(' ') || '';
        const nativeChineseCount = (nativeText.match(/[\u3400-\u9fff]/g) || []).length;

        const ocrWords = ocrPage ? getWords(ocrPage) : [];
        const ocrChineseCount = ocrWords.filter(w => hasHanzi(w.text)).length;

        // If OCR has Chinese text and native PDF has broken/empty Chinese font encoding, prefer OCR overlay
        const preferOcr = ocrPage && ocrChineseCount > 0 && (nativeChineseCount === 0 || ocrChineseCount > nativeChineseCount * 1.5);

        if (preferOcr) {
          renderOcrOverlay(textLayerDiv, ocrPage, viewport);
        } else if (textContent && textContent.items && textContent.items.length > 0 && textContent.items.some((item) => item.str && item.str.trim().length > 0)) {
          textLayerDiv.innerHTML = '';
          textLayerDiv.style.height = `${viewport.height}px`;
          textLayerDiv.style.width = `${viewport.width}px`;
          textLayerDiv.style.setProperty('--scale-factor', scale);

          await window.pdfjsLib.renderTextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
            textDivs: []
          }).promise;
          if (!cancelled) processPdfTextLayerForClick(textLayerDiv);
        } else if (ocrPage) {
          renderOcrOverlay(textLayerDiv, ocrPage, viewport);
        }

        requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));

        // Background pre-fetch next & previous pages for instant 0ms flipping
        if (pdfDoc) {
          if (pageNumber < totalPages) pdfDoc.getPage(pageNumber + 1).catch(() => {});
          if (pageNumber > 1) pdfDoc.getPage(pageNumber - 1).catch(() => {});
        }
      } catch (error) {
        if (error?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', error);
        }
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    };

    renderPage();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
    };
  }, [pdfDoc, pageNumber, scale, showPinyin, activeTool, annotations, ocrPage]);

  const goToPage = (nextPage) => {
    const bounded = Math.max(1, Math.min(nextPage, totalPages || 1));
    onPageChange?.(bounded);
  };

  const commitPageInput = () => {
    const nextPage = Number(pageInput);
    if (!Number.isFinite(nextPage)) {
      setPageInput(String(pageNumber));
      return;
    }
    goToPage(Math.round(nextPage));
  };

  const zoomBy = (amount) => {
    setFitMode('custom');
    setScale((current) => clampScale(current + amount));
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await readerRootRef.current?.requestFullscreen?.();
      }
    } catch (error) {
      console.warn('Cannot toggle PDF fullscreen.', error);
    }
  };

  return (
    <div ref={readerRootRef} className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm sm:rounded-xl">
      <div ref={scrollAreaRef} className="relative min-h-0 flex-1 overflow-auto bg-slate-100/60 p-1 sm:p-3">
        {!pdfDoc && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm p-6 text-center">
            {loadError ? (
              <div className="max-w-md bg-white p-6 rounded-2xl border border-rose-200 shadow-xl">
                <p className="text-sm font-bold text-rose-600 mb-2">Không thể tải tài liệu</p>
                <p className="text-xs text-slate-500 mb-4">{loadError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                >
                  Tải lại trang
                </button>
              </div>
            ) : (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-600">Đang tải tài liệu...</p>
                {loadProgress > 0 && (
                  <div className="mt-3 w-48 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-200"
                      style={{ width: `${loadProgress}%` }}
                    />
                  </div>
                )}
                {loadProgress > 0 && (
                  <span className="mt-1 text-[11px] font-semibold text-slate-400">{loadProgress}%</span>
                )}
              </>
            )}
          </div>
        )}

        <div className="relative mx-auto w-fit max-w-full rounded-md bg-white shadow-md ring-1 ring-slate-900/10 transition-transform duration-200 sm:shadow-lg">
          <canvas ref={canvasRef} className="block rounded-md" />
          <div ref={textLayerRef} className="textLayer absolute inset-0 z-10 overflow-hidden rounded-md leading-none opacity-100" style={{ color: 'transparent' }} />
          <canvas
            ref={drawingCanvasRef}
            data-page-number={pageNumber}
            className={`absolute inset-0 z-30 h-full w-full ${(activeTool === 'pencil' || activeTool === 'eraser') ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
            style={{ touchAction: (activeTool === 'pencil' || activeTool === 'eraser') ? 'none' : 'auto' }}
            onPointerDown={onDrawingPointerDown}
            onPointerMove={onDrawingPointerMove}
            onPointerUp={onDrawingPointerUp}
            onPointerLeave={onDrawingPointerUp}
          />
        </div>

        {/* Bottom Pagination & Navigation Bar */}
        <div className="mx-auto my-6 flex w-fit items-center gap-2.5 sm:gap-3.5 rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-md transition-all">
          <button
            onClick={() => {
              goToPage(pageNumber - 1);
              scrollAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={pageNumber <= 1}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
            title="Trang trước"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Trang trước</span>
          </button>

          <div className="flex items-center gap-2 px-1 text-xs font-bold text-slate-700">
            <span className="text-slate-400 font-semibold hidden sm:inline">Trang</span>
            <input
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value.replace(/[^0-9]/g, ''))}
              onBlur={commitPageInput}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
              className="h-7 w-11 rounded-lg border border-slate-200 bg-slate-50 text-center text-xs font-black text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              aria-label="Nhập số trang"
            />
            <span className="text-slate-400">/ {totalPages || '?'}</span>
          </div>

          <button
            onClick={() => {
              goToPage(pageNumber + 1);
              scrollAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={pageNumber >= totalPages}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none active:scale-95"
            title="Trang kế tiếp"
          >
            <span>Trang kế tiếp</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {isLoadingOcr && (
          <div className="pointer-events-none absolute right-4 top-4 z-40 flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-2 text-xs font-bold text-blue-700 shadow-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> OCR
          </div>
        )}
      </div>

      {/* Render the PDF controls beside the annotation actions in ReaderPage. */}
      {typeof window !== 'undefined' && document.getElementById('pdf-reader-controls') && createPortal(
        <div className="min-w-0 overflow-x-auto overscroll-x-contain scrollbar-thin">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <button
              onClick={() => goToPage(pageNumber - 1)}
              disabled={pageNumber <= 1}
              className="flex h-9 min-h-9 w-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10 sm:rounded-xl"
              title="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex h-9 min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm font-bold text-slate-700 sm:h-10 sm:rounded-xl sm:gap-2">
              <span className="hidden text-xs uppercase tracking-wide text-slate-500 sm:inline">Trang</span>
              <input
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value.replace(/[^0-9]/g, ''))}
                onBlur={commitPageInput}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
                className="h-6 w-9 rounded-md border border-slate-200 bg-white text-center text-sm font-black text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:h-7 sm:w-10 sm:rounded-lg"
                aria-label="Nhập số trang"
              />
              <span className="whitespace-nowrap text-xs text-slate-500">/ {totalPages || '?'}</span>
            </div>

            <button
              onClick={() => goToPage(pageNumber + 1)}
              disabled={pageNumber >= totalPages}
              className="flex h-9 min-h-9 w-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10 sm:rounded-xl"
              title="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="mx-1 h-6 w-px shrink-0 bg-slate-200" />

            <button
              onClick={() => zoomBy(-0.15)}
              className="flex h-9 min-h-9 w-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600 sm:h-10 sm:w-10 sm:rounded-xl"
              title="Thu nhỏ"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="flex h-9 min-h-9 min-w-[58px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm font-black text-slate-800 sm:h-10 sm:min-w-[64px] sm:rounded-xl">
              {zoomPercent}%
            </div>
            <button
              onClick={() => zoomBy(0.15)}
              className="flex h-9 min-h-9 w-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600 sm:h-10 sm:w-10 sm:rounded-xl"
              title="Phóng to"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setFitMode('width')}
              className={`h-9 min-h-9 rounded-lg border px-2.5 text-xs font-bold transition-colors sm:h-10 sm:rounded-xl sm:px-3 ${fitMode === 'width' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
            >
              Fit Width
            </button>
            <button
              onClick={() => setFitMode('page')}
              className={`h-9 min-h-9 rounded-lg border px-2.5 text-xs font-bold transition-colors sm:h-10 sm:rounded-xl sm:px-3 ${fitMode === 'page' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
            >
              Fit Page
            </button>

            <button
              onClick={toggleFullscreen}
              className="flex h-9 min-h-9 w-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600 sm:h-10 sm:w-10 sm:rounded-xl"
              title="Toàn màn hình"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>,
        document.getElementById('pdf-reader-controls')
      )}

      <style>{`
        .textLayer {
          position: absolute;
          inset: 0;
          overflow: hidden;
          opacity: 1;
          line-height: 1;
          pointer-events: auto !important;
          z-index: 20;
        }
        .textLayer > span {
          color: transparent;
          position: absolute;
          overflow: visible !important;
          white-space: pre;
          cursor: pointer !important;
          transform-origin: 0% 0%;
          pointer-events: auto !important;
          user-select: text;
        }
        .hanora-pdf-ocr-word {
          position: absolute;
          display: block;
          overflow: visible !important;
          color: transparent;
          white-space: nowrap;
          cursor: pointer !important;
          line-height: 1;
          pointer-events: auto !important;
          user-select: text;
          transition: background-color 150ms ease;
        }
        .textLayer .word-highlight:hover,
        .textLayer .hanora-pdf-ocr-word:hover,
        .hanora-pdf-token:hover {
          background-color: rgba(59, 130, 246, 0.28) !important;
          border-radius: 4px;
          outline: 1px solid rgba(59, 130, 246, 0.4);
        }
        .hanora-pdf-token {
          position: relative;
          isolation: isolate;
          overflow: visible !important;
          cursor: pointer !important;
          pointer-events: auto !important;
          display: inline-block;
        }
        .hanora-pdf-token.hanora-token-selecting {
          background-color: rgba(37, 99, 235, 0.28) !important;
          outline: 1px solid rgba(37, 99, 235, 0.45);
        }
        .hanora-note-badge {
          position: absolute;
          right: -0.72em;
          top: -0.82em;
          z-index: 2;
          color: #e11d48;
          font-size: 0.72em;
          line-height: 1;
          pointer-events: auto;
          text-shadow: 0 1px 2px #fff, 0 -1px 2px #fff;
        }
        .hanora-pinyin-label {
          position: absolute;
          left: 50%;
          bottom: 100%;
          transform: translateX(-50%);
          color: #2563eb;
          font-size: 10px;
          font-weight: 800;
          line-height: 1;
          pointer-events: none;
          white-space: nowrap;
          text-shadow: 0 1px 2px #fff, 0 -1px 2px #fff;
        }
      `}</style>
    </div>
  );
};

export default PdfVisualReader;


