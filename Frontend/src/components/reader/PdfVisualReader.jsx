import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Loader2, Maximize2, Minimize2, Minus, Plus, RefreshCw } from 'lucide-react';
import { segmentChineseText, cleanPinyin, CHINESE_DICTIONARY } from '../../utils/chineseUtils';
import { pinyin } from 'pinyin-pro';
import { generateDocumentOcrPage } from '../../lib/api';
import { toast } from '../../store/notificationStore';

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const clampScale = (value) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

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

const getWords = (page) => {
  const lines = valueOf(page, 'lines', 'Lines', []);
  const pageWidth = Number(valueOf(page, 'width', 'Width', 0)) || null;

  return lines.flatMap((line, lineIndex) => {
    const words = valueOf(line, 'words', 'Words', []);
    const lineText = valueOf(line, 'text', 'Text', '');
    const lineBox = getBox(valueOf(line, 'boundingBox', 'BoundingBox'));
    const fittedLineBox = fitTextBoxToContent(lineText, lineBox, pageWidth);

    let lineWords = [];

    if (shouldSplitFromLineBox(lineText, fittedLineBox, words)) {
      lineWords = splitTextBoxIntoHitWords(lineText, fittedLineBox, lineIndex + '-line');
    } else if (Array.isArray(words) && words.some((word) => getBox(valueOf(word, 'boundingBox', 'BoundingBox')))) {
      lineWords = words.flatMap((word, wordIndex) => {
        const text = valueOf(word, 'text', 'Text', '');
        const box = fitTextBoxToContent(text, getBox(valueOf(word, 'boundingBox', 'BoundingBox')), pageWidth);
        return splitTextBoxIntoHitWords(text, box, lineIndex + '-' + wordIndex);
      });
    } else {
      lineWords = splitTextBoxIntoHitWords(lineText, fittedLineBox, lineIndex + '-line');
    }

    return splitTextBoxIntoHitWords(lineText, fittedLineBox, lineIndex + '-line');
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
  const [isRegeneratingOcr, setIsRegeneratingOcr] = useState(false);

  const forceRegenerateOcrForPage = async () => {
    if (!documentId || pageNumber < 1 || isRegeneratingOcr) return;
    setIsRegeneratingOcr(true);
    toast.info("Đang nhận diện lại chữ cho trang này...");
    try {
      const result = await generateDocumentOcrPage(documentId, pageNumber);
      const page = result?.page || result?.Page;
      if (!page) {
        throw new Error("Không lấy được dữ liệu OCR mới từ server.");
      }
      const identifiedPage = withPageIdentity(page, pageNumber);
      setOcrPages((prev) => {
        const withoutPage = prev.filter((item, index) => getPageIdentity(item, index) !== pageNumber);
        return [...withoutPage, identifiedPage].sort((a, b) => getPageIdentity(a, 0) - getPageIdentity(b, 0));
      });
      toast.success("Đã nhận diện lại chữ thành công!");
    } catch (error) {
      console.error(error);
      toast.error("Nhận diện thất bại: " + error.message);
    } finally {
      setIsRegeneratingOcr(false);
    }
  };

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

  useEffect(() => {
    let isMounted = true;
    if (!ocrJsonUrl) {
      setOcrPages([]);
      setIsLoadingOcr(false);
      return undefined;
    }

    setIsLoadingOcr(true);
    fetch(ocrJsonUrl)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Cannot load OCR layout')))
      .then((payload) => {
        if (isMounted) setOcrPages(normalizePages(payload));
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

  useEffect(() => {
    if (!fileUrl) return undefined;
    let cancelled = false;

    const loadPdf = async () => {
      try {
        const pdfjsLib = window.pdfjsLib;
        if (!pdfjsLib) {
          console.error('PDF.js not loaded.');
          return;
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';

        const loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        onPageChange?.(1);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };

    loadPdf();
    return () => { cancelled = true; };
  }, [fileUrl, onPageChange]);

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
    
    const viewBox = viewport.viewBox || [0, 0, viewport.width / scale, viewport.height / scale];
    const pdfWidth = viewBox[2] - viewBox[0];
    const pdfHeight = viewBox[3] - viewBox[1];

    words.forEach((word, wordIndex) => {
      const absIndex = (pageNumber - 1) * 10000 + wordIndex;
      const span = document.createElement('span');
      span.textContent = word.text;
      span.className = 'hanora-pdf-ocr-word';

      const ocrXPercent = word.box.x / pageWidth;
      const ocrYPercent = word.box.y / pageHeight;
      const ocrWidthPercent = word.box.width / pageWidth;
      const ocrHeightPercent = word.box.height / pageHeight;

      const pdfX = viewBox[0] + ocrXPercent * pdfWidth;
      const pdfY = viewBox[1] + (1 - ocrYPercent) * pdfHeight;

      const pdfX2 = pdfX + ocrWidthPercent * pdfWidth;
      const pdfY2 = pdfY - ocrHeightPercent * pdfHeight;

      const [viewX, viewY] = viewport.convertToViewportPoint(pdfX, pdfY);
      const [viewX2, viewY2] = viewport.convertToViewportPoint(pdfX2, pdfY2);

      const spanWidth = Math.max(1, viewX2 - viewX);
      const spanHeight = Math.max(1, viewY2 - viewY);

      span.style.left = `${viewX}px`;
      span.style.top = `${viewY}px`;
      span.style.width = `${spanWidth}px`;
      span.style.height = `${spanHeight}px`;
      span.style.fontSize = `${Math.max(10, spanHeight * 0.92)}px`;
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

        const renderedOcr = ocrPage ? renderOcrOverlay(textLayerDiv, ocrPage, viewport) : false;
        if (!renderedOcr) {
          textLayerDiv.innerHTML = '';
          textLayerDiv.style.height = `${viewport.height}px`;
          textLayerDiv.style.width = `${viewport.width}px`;
          textLayerDiv.style.setProperty('--scale-factor', scale);

          const textContent = await page.getTextContent();
          await window.pdfjsLib.renderTextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
            textDivs: []
          }).promise;
          if (!cancelled) processPdfTextLayerForClick(textLayerDiv);
        }

        requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
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
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-500">Đang tải tài liệu...</p>
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
            onClick={forceRegenerateOcrForPage}
            disabled={isRegeneratingOcr}
            className="flex h-9 min-h-9 px-2.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 sm:h-10 sm:rounded-xl sm:px-3 text-xs font-bold gap-1.5"
            title="Nhận diện lại chữ (OCR)"
          >
            {isRegeneratingOcr ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span className="hidden lg:inline">OCR lại trang</span>
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
        .textLayer { position: absolute; inset: 0; overflow: hidden; opacity: 1; line-height: 1; }
        .textLayer > span { color: transparent; position: absolute; overflow: visible !important; white-space: pre; cursor: text; transform-origin: 0% 0%; }
        .hanora-pdf-ocr-word { position: absolute; display: block; overflow: visible !important; color: transparent; white-space: nowrap; cursor: text; line-height: 1; }
        .textLayer .word-highlight:hover, .textLayer .hanora-pdf-ocr-word:hover { background-color: rgba(250, 204, 21, 0.32); border-radius: 4px; }
        .hanora-pdf-token { position: relative; isolation: isolate; overflow: visible !important; }
        .hanora-pdf-token.hanora-token-selecting { background-color: rgba(37, 99, 235, 0.24) !important; outline: 1px solid rgba(37, 99, 235, 0.28); }
        .hanora-note-badge { position: absolute; right: -0.72em; top: -0.82em; z-index: 2; color: #e11d48; font-size: 0.72em; line-height: 1; pointer-events: auto; text-shadow: 0 1px 2px #fff, 0 -1px 2px #fff; }
        .hanora-pinyin-label { position: absolute; left: 50%; bottom: 100%; transform: translateX(-50%); color: #2563eb; font-size: 10px; font-weight: 800; line-height: 1; pointer-events: none; white-space: nowrap; text-shadow: 0 1px 2px #fff, 0 -1px 2px #fff; }
      `}</style>
    </div>
  );
};

export default PdfVisualReader;


