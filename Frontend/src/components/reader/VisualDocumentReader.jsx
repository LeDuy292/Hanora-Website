import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { pinyin } from 'pinyin-pro';
import { cleanPinyin, segmentChineseText } from '../../utils/chineseUtils';
import PdfVisualReader from './PdfVisualReader';
import { resolveDocumentAssetUrl } from '../../lib/api';

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
    const rawWords = valueOf(line, 'words', 'Words', []);
    const lineText = valueOf(line, 'text', 'Text', '');

    if (!lineText) return [];

    const tokens = segmentChineseText(lineText);
    const validWordBoxes = Array.isArray(rawWords)
      ? rawWords
          .map((w) => ({
            text: valueOf(w, 'text', 'Text', ''),
            box: getBox(valueOf(w, 'boundingBox', 'BoundingBox'))
          }))
          .filter((w) => w.text && w.box)
      : [];

    if (validWordBoxes.length > 0 && tokens.length > 0) {
      const resultWords = [];
      let boxIdx = 0;

      for (let tIdx = 0; tIdx < tokens.length; tIdx++) {
        const tokenText = tokens[tIdx].text;
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

    if (Array.isArray(rawWords) && rawWords.length > 0) {
      return rawWords.map((word, wordIndex) => ({
        key: `${lineIndex}-${wordIndex}-${valueOf(word, 'text', 'Text', '')}`,
        text: valueOf(word, 'text', 'Text', ''),
        box: getBox(valueOf(word, 'boundingBox', 'BoundingBox')),
      }));
    }

    return [{
      key: `${lineIndex}-line`,
      text: lineText,
      box: getBox(valueOf(line, 'boundingBox', 'BoundingBox')),
    }];
  }).filter((word) => word.text && word.box && !/[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(word.text) && /[\u3400-\u9fff0-9]/.test(word.text));
};

const ImageOcrReader = ({
  fileUrl,
  ocrJsonUrl,
  onWordClick,
  showPinyin = false,
  annotations = {},
  selectionRange = null,
  activeTool = 'pointer',
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
  const imageRef = useRef(null);
  const [ocrPages, setOcrPages] = useState([]);
  const [imageSize, setImageSize] = useState({ naturalWidth: 0, naturalHeight: 0, width: 0, height: 0 });
  const [isLoadingOcr, setIsLoadingOcr] = useState(Boolean(ocrJsonUrl));

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
        console.warn('Cannot load OCR layout.', error);
        if (isMounted) setOcrPages([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingOcr(false);
      });

    return () => { isMounted = false; };
  }, [ocrJsonUrl]);

  useEffect(() => {
    const updateSize = () => {
      const image = imageRef.current;
      if (!image) return;
      const rect = image.getBoundingClientRect();
      setImageSize({
        naturalWidth: image.naturalWidth || rect.width,
        naturalHeight: image.naturalHeight || rect.height,
        width: rect.width,
        height: rect.height,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [fileUrl]);

  const firstPage = ocrPages[0];
  const words = useMemo(() => getWords(firstPage), [firstPage]);
  const pageWidth = Number(valueOf(firstPage, 'width', 'Width', imageSize.naturalWidth)) || imageSize.naturalWidth || 1;
  const pageHeight = Number(valueOf(firstPage, 'height', 'Height', imageSize.naturalHeight)) || imageSize.naturalHeight || 1;
  const scaleX = imageSize.width / pageWidth;
  const scaleY = imageSize.height / pageHeight;

  return (
    <div className="hanora-visual-reader flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
      <div className="flex-1 overflow-auto p-1 sm:p-2">
        <div className="relative mx-auto w-fit max-w-full rounded-lg bg-white shadow-lg ring-1 ring-slate-900/10">
          <img
            ref={imageRef}
            src={fileUrl}
            alt="Tài liệu gốc"
            className="block h-auto max-h-none max-w-full rounded-xl"
            onLoad={() => {
              const image = imageRef.current;
              if (!image) return;
              const rect = image.getBoundingClientRect();
              setImageSize({
                naturalWidth: image.naturalWidth || rect.width,
                naturalHeight: image.naturalHeight || rect.height,
                width: rect.width,
                height: rect.height,
              });
              requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
            }}
          />

          <canvas
            ref={drawingCanvasRef}
            className={`absolute inset-0 z-30 h-full w-full ${(activeTool === 'pencil' || activeTool === 'eraser') ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
            style={{ touchAction: (activeTool === 'pencil' || activeTool === 'eraser') ? 'none' : 'auto' }}
            onPointerDown={onDrawingPointerDown}
            onPointerMove={onDrawingPointerMove}
            onPointerUp={onDrawingPointerUp}
            onPointerLeave={onDrawingPointerUp}
          />

          {words.length > 0 && imageSize.width > 0 && (
            <div className="absolute inset-0 z-10 select-text overflow-hidden rounded-xl">
              {words.map((word, wordIndex) => {
                const box = word.box;
                const absIndex = wordIndex;
                const highlightColor = annotations?.highlights?.[absIndex];
                 const rangeStart = selectionRange ? Math.min(selectionRange.start, selectionRange.end) : -1;
                const rangeEnd = selectionRange ? Math.max(selectionRange.start, selectionRange.end) : -1;
                const isSelecting = absIndex >= rangeStart && absIndex <= rangeEnd;
                const isFirst = absIndex === rangeStart;
                const isLast = absIndex === rangeEnd;
                const borderRadius = isSelecting
                  ? (isFirst && isLast ? '3px' : isFirst ? '3px 0 0 3px' : isLast ? '0 3px 3px 0' : '0')
                  : '3px';
                const style = {
                  left: `${box.x * scaleX}px`,
                  top: `${box.y * scaleY}px`,
                  width: `${box.width * scaleX}px`,
                  height: `${box.height * scaleY}px`,
                  fontSize: `${Math.max(10, box.height * scaleY * 0.9)}px`,
                  borderRadius,
                };

                return (
                  <span
                    key={word.key}
                    data-abs-index={absIndex}
                    className="hanora-ocr-word absolute cursor-text whitespace-nowrap text-transparent transition"
                    style={highlightColor ? { ...style, backgroundColor: `${highlightColor}66`, boxShadow: 'none' } : isSelecting ? { ...style, backgroundColor: 'rgba(59, 130, 246, 0.3)', outline: 'none' } : style}
                    onClick={(event) => {
                      event.stopPropagation();
                      onWordClick?.(word.text, absIndex, event);
                    }}
                    onPointerDown={(event) => onWordPointerDown?.(absIndex, event)}
                    onPointerEnter={(event) => onWordPointerEnter?.(absIndex, event)}
                    onPointerUp={(event) => onWordPointerUp?.(absIndex, event)}
                    onPointerCancel={onWordPointerCancel}
                    onPointerLeave={onWordPointerLeave}
                    onMouseEnter={(event) => onWordMouseEnter?.(absIndex, event)}
                    onMouseLeave={onWordMouseLeave}
                    onContextMenu={(event) => {
                      if (annotations?.highlights?.[absIndex]) {
                        event.preventDefault();
                        onHighlightContextMenu?.(absIndex, event);
                      }
                    }}
                  >
                    {word.text}
                    {(annotations?.textNotes?.[absIndex] || annotations?.stickyNotes?.[absIndex]) && (
                      <span
                        className="hanora-image-note-badge"
                        title={annotations?.stickyNotes?.[absIndex] || annotations?.textNotes?.[absIndex] || ''}
                      >
                        {annotations?.stickyNotes?.[absIndex] ? '\uD83D\uDCCC' : '\uD83D\uDCA1'}
                      </span>
                    )}
                    {showPinyin && (
                      <span className="hanora-image-pinyin">{cleanPinyin(word.text, pinyin(word.text, { type: 'string' }))}</span>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {isLoadingOcr && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-white/40 backdrop-blur-[1px]">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>
      <style>{`
        .hanora-ocr-word { 
          display: block;
          overflow: hidden;
          box-sizing: border-box;
          line-height: 1;
          padding: 0;
        }
        .hanora-ocr-word::selection { background: rgba(37, 99, 235, 0.24); color: transparent; }
        .hanora-ocr-word:hover { background-color: rgba(250, 204, 21, 0.32); }
        .hanora-image-note-badge {
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
        .hanora-image-pinyin {
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

const VisualDocumentReader = ({
  documentId,
  fileUrl,
  fileType,
  ocrJsonUrl,
  onWordClick,
  showPinyin = false,
  activeTool = 'pointer',
  activeColor = '#fef08a',
  annotations = {},
  selectionRange = null,
  currentPage = 1,
  onPageChange,
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
  if (!fileUrl) return null;
  const resolvedFileUrl = resolveDocumentAssetUrl(fileUrl);
  const resolvedOcrJsonUrl = resolveDocumentAssetUrl(ocrJsonUrl);

  if (fileType === 'pdf') {
    return (
      <PdfVisualReader
        documentId={documentId}
        fileUrl={resolvedFileUrl}
        onWordClick={onWordClick}
        ocrJsonUrl={resolvedOcrJsonUrl}
        currentPage={currentPage}
        onPageChange={onPageChange}
        showPinyin={showPinyin}
        activeTool={activeTool}
        activeColor={activeColor}
        annotations={annotations}
        selectionRange={selectionRange}
        drawingCanvasRef={drawingCanvasRef}
        onDrawingPointerDown={onDrawingPointerDown}
        onDrawingPointerMove={onDrawingPointerMove}
        onDrawingPointerUp={onDrawingPointerUp}
        onWordPointerDown={onWordPointerDown}
        onWordPointerEnter={onWordPointerEnter}
        onWordPointerUp={onWordPointerUp}
        onWordPointerCancel={onWordPointerCancel}
        onWordPointerLeave={onWordPointerLeave}
        onHighlightContextMenu={onHighlightContextMenu}
        onWordMouseEnter={onWordMouseEnter}
        onWordMouseLeave={onWordMouseLeave}
      />
    );
  }
  if (fileType === 'image') {
    return (
      <ImageOcrReader
        fileUrl={resolvedFileUrl}
        ocrJsonUrl={resolvedOcrJsonUrl}
        onWordClick={onWordClick}
        showPinyin={showPinyin}
        annotations={annotations}
        selectionRange={selectionRange}
        activeTool={activeTool}
        drawingCanvasRef={drawingCanvasRef}
        onDrawingPointerDown={onDrawingPointerDown}
        onDrawingPointerMove={onDrawingPointerMove}
        onDrawingPointerUp={onDrawingPointerUp}
        onWordPointerDown={onWordPointerDown}
        onWordPointerEnter={onWordPointerEnter}
        onWordPointerUp={onWordPointerUp}
        onWordPointerCancel={onWordPointerCancel}
        onWordPointerLeave={onWordPointerLeave}
        onHighlightContextMenu={onHighlightContextMenu}
        onWordMouseEnter={onWordMouseEnter}
        onWordMouseLeave={onWordMouseLeave}
      />
    );
  }
  return null;
};

export default VisualDocumentReader;
