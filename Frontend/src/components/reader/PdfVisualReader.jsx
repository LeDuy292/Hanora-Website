import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Maximize2, Minimize2, Minus, Plus } from 'lucide-react';
import { segmentChineseText } from '../../utils/chineseUtils';
import { pinyin } from 'pinyin-pro';
import { generateDocumentOcrPage } from '../../lib/api';

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

const getWords = (page) => {
  const lines = valueOf(page, 'lines', 'Lines', []);
  return lines.flatMap((line, lineIndex) => {
    const words = valueOf(line, 'words', 'Words', []);
    if (Array.isArray(words) && words.some((word) => getBox(valueOf(word, 'boundingBox', 'BoundingBox')))) {
      return words.map((word, wordIndex) => ({
        key: `${lineIndex}-${wordIndex}-${valueOf(word, 'text', 'Text', '')}`,
        text: valueOf(word, 'text', 'Text', ''),
        box: getBox(valueOf(word, 'boundingBox', 'BoundingBox')),
      }));
    }

    return [{
      key: `${lineIndex}-line`,
      text: valueOf(line, 'text', 'Text', ''),
      box: getBox(valueOf(line, 'boundingBox', 'BoundingBox')),
    }];
  }).filter((word) => word.text && word.box);
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
    if (!documentId || !pdfDoc || isLoadingOcr || hasOcrPageForCurrentPage || pageNumber < 1) return;
    if (requestedOcrPagesRef.current.has(pageNumber)) return;

    requestedOcrPagesRef.current.add(pageNumber);
    generateDocumentOcrPage(documentId, pageNumber)
      .then((result) => {
        const page = result?.page || result?.Page;
        if (!page) {
          requestedOcrPagesRef.current.delete(pageNumber);
          return;
        }
        const identifiedPage = withPageIdentity(page, pageNumber);
        setOcrPages((prev) => {
          const withoutPage = prev.filter((item, index) => getPageIdentity(item, index) !== pageNumber);
          return [...withoutPage, identifiedPage].sort((a, b) => getPageIdentity(a, 0) - getPageIdentity(b, 0));
        });
      })
      .catch((error) => {
        requestedOcrPagesRef.current.delete(pageNumber);
        console.warn('Cannot generate OCR for PDF page ' + pageNumber + '.', error);
      });
  }, [documentId, pdfDoc, isLoadingOcr, hasOcrPageForCurrentPage, pageNumber]);

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
    wordSpan.style.borderRadius = '3px';
    wordSpan.style.transition = 'background 150ms ease, box-shadow 150ms ease, outline 150ms ease';

    const rangeStart = selectionRange ? Math.min(selectionRange.start, selectionRange.end) : -1;
    const rangeEnd = selectionRange ? Math.max(selectionRange.start, selectionRange.end) : -1;
    const isSelecting = absIndex >= rangeStart && absIndex <= rangeEnd;

    if (highlightColor) {
      wordSpan.style.backgroundColor = `${highlightColor}73`;
      wordSpan.style.boxShadow = 'inset 0 -0.08em 0 rgba(15, 23, 42, 0.08)';
    } else if (isSelecting) {
      wordSpan.style.backgroundColor = 'rgba(37, 99, 235, 0.24)';
      wordSpan.style.outline = '1px solid rgba(37, 99, 235, 0.28)';
    }

    if (hasTextNote || hasStickyNote) {
      const noteBadge = document.createElement('span');
      noteBadge.textContent = hasStickyNote ? '📌' : '💡';
      noteBadge.className = 'hanora-note-badge';
      noteBadge.title = hasStickyNote || hasTextNote || '';
      wordSpan.appendChild(noteBadge);
    }

    if (showPinyin) {
      const pinyinLabel = document.createElement('span');
      pinyinLabel.textContent = pinyin(word, { type: 'string' });
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
    const scaleX = viewport.width / pageWidth;
    const scaleY = viewport.height / pageHeight;

    words.forEach((word, wordIndex) => {
      const absIndex = (pageNumber - 1) * 10000 + wordIndex;
      const span = document.createElement('span');
      span.textContent = word.text;
      span.className = 'hanora-pdf-ocr-word';
      span.style.left = `${word.box.x * scaleX}px`;
      span.style.top = `${word.box.y * scaleY}px`;
      span.style.width = `${word.box.width * scaleX}px`;
      span.style.height = `${word.box.height * scaleY}px`;
      span.style.fontSize = `${Math.max(10, word.box.height * scaleY * 0.92)}px`;
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

        if (token.isWord) {
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
      <div className="shrink-0 border-b border-slate-200 bg-white/95 px-1.5 py-1.5 sm:px-3 sm:py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain whitespace-nowrap scrollbar-thin">
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
      </div>

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

      <style>{`
        .textLayer { position: absolute; inset: 0; overflow: hidden; opacity: 1; line-height: 1; }
        .textLayer > span { color: transparent; position: absolute; white-space: pre; cursor: text; transform-origin: 0% 0%; }
        .hanora-pdf-ocr-word { position: absolute; color: transparent; white-space: nowrap; cursor: text; line-height: 1; }
        .textLayer .word-highlight:hover, .textLayer .hanora-pdf-ocr-word:hover { background-color: rgba(250, 204, 21, 0.32); border-radius: 4px; }
        .hanora-pdf-token { position: relative; isolation: isolate; }
        .hanora-pdf-token.hanora-token-selecting { background-color: rgba(37, 99, 235, 0.24) !important; outline: 1px solid rgba(37, 99, 235, 0.28); }
        .hanora-note-badge { position: absolute; right: -0.72em; top: -0.82em; z-index: 2; color: #e11d48; font-size: 0.72em; line-height: 1; pointer-events: auto; text-shadow: 0 1px 2px #fff, 0 -1px 2px #fff; }
        .hanora-pinyin-label { position: absolute; left: 50%; bottom: 100%; transform: translateX(-50%); color: #2563eb; font-size: 10px; font-weight: 800; line-height: 1; pointer-events: none; white-space: nowrap; text-shadow: 0 1px 2px #fff, 0 -1px 2px #fff; }
      `}</style>
    </div>
  );
};

export default PdfVisualReader;


