import React, { useEffect, useRef, useState } from 'react';
import { segmentChineseText } from '../../utils/chineseUtils';

const PdfVisualReader = ({ fileUrl, onWordClick }) => {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [scale, setScale] = useState(2.0);
  
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Initialize PDF
  useEffect(() => {
    if (!fileUrl) return;
    
    const loadPdf = async () => {
      try {
        const pdfjsLib = window.pdfjsLib;
        if (!pdfjsLib) {
          console.error("PDF.js not loaded.");
          return;
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
        
        const loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
      } catch (error) {
        console.error("Error loading PDF:", error);
      }
    };
    loadPdf();
  }, [fileUrl]);

  // Render Page
  useEffect(() => {
    if (!pdfDoc) return;
    
    const renderPage = async () => {
      if (isRendering) return;
      setIsRendering(true);
      
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        
        // 1. Render Canvas
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        if (renderTaskRef.current) {
          await renderTaskRef.current.cancel();
        }
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
        
        // 2. Render TextLayer
        const textLayerDiv = textLayerRef.current;
        textLayerDiv.innerHTML = ''; // Clear previous
        textLayerDiv.style.height = `${viewport.height}px`;
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.setProperty('--scale-factor', scale);
        
        const textContent = await page.getTextContent();
        
        // Use PDF.js built-in renderTextLayer
        await window.pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport: viewport,
          textDivs: []
        }).promise;
        
        // 3. Post-process TextLayer for clickability
        processTextLayerForClick(textLayerDiv);
        
      } catch (error) {
        if (error.name !== 'RenderingCancelledException') {
          console.error("Error rendering page:", error);
        }
      } finally {
        setIsRendering(false);
      }
    };
    
    renderPage();
  }, [pdfDoc, currentPage, scale]);

  const processTextLayerForClick = (textLayerDiv) => {
    const spans = textLayerDiv.querySelectorAll('span');
    
    spans.forEach(span => {
      const text = span.textContent;
      if (!text || text.trim() === '') return;
      
      // Segment the text inside the span
      const tokens = segmentChineseText(text);
      
      // Clear original text
      span.textContent = '';
      
      // Append segmented tokens
      tokens.forEach(token => {
        const wordSpan = document.createElement('span');
        wordSpan.textContent = token.text;
        
        // Make it clickable and style it invisibly or minimally
        if (token.isWord) {
          wordSpan.style.cursor = 'pointer';
          wordSpan.className = 'word-highlight transition-all';
          wordSpan.onclick = (e) => {
            e.stopPropagation();
            if (onWordClick) {
              onWordClick(token.text);
            }
          };
        }
        
        span.appendChild(wordSpan);
      });
    });
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 rounded-[2rem] overflow-hidden relative border border-slate-100 shadow-sm">
      {/* Toolbar - Floating Pill Style */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-lg shadow-slate-200/40 px-5 py-2.5 rounded-full flex justify-between items-center z-20 gap-8">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setScale(Math.max(0.5, scale - 0.2))}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            title="Thu nhỏ"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
          </button>
          <span className="text-xs font-bold text-slate-700 min-w-[48px] text-center bg-slate-100 px-2 py-1 rounded-full">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => setScale(Math.min(3.0, scale + 0.2))}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            title="Phóng to"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
          </button>
        </div>
        
        <div className="w-[1px] h-6 bg-slate-200"></div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrevPage} 
            disabled={currentPage <= 1}
            className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-40 text-slate-500 hover:text-blue-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">
            Trang <span className="text-slate-800">{currentPage}</span> / {totalPages || '?'}
          </span>
          <button 
            onClick={handleNextPage} 
            disabled={currentPage >= totalPages}
            className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-40 text-slate-500 hover:text-blue-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* PDF Container */}
      <div className="flex-1 overflow-auto bg-slate-100/50 flex justify-center p-8 pb-24 relative scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {!pdfDoc && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-30">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-blue-500 rounded-full border-t-transparent animate-spin absolute inset-0"></div>
            </div>
            <p className="mt-4 text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Đang tải tài liệu...</p>
          </div>
        )}
        
        {/* Wrapper for Canvas & TextLayer */}
        <div 
          className="relative shadow-2xl ring-1 ring-slate-900/5 bg-white transition-transform duration-200 rounded-md" 
          style={{ width: canvasRef.current?.width || 'auto', height: canvasRef.current?.height || 'auto', minHeight: '800px', minWidth: '600px' }}
        >
          <canvas ref={canvasRef} className="block rounded-md" />
          
          {/* PDF.js TextLayer styles require position absolute, top/left 0 */}
          <div 
            ref={textLayerRef} 
            className="textLayer absolute inset-0 overflow-hidden leading-none opacity-100 rounded-md"
            style={{ color: 'transparent' }} // Make original text transparent, user sees canvas underneath
          ></div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .textLayer {
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          opacity: 1;
          line-height: 1.0;
        }
        .textLayer > span {
          color: transparent;
          position: absolute;
          white-space: pre;
          cursor: text;
          transform-origin: 0% 0%;
        }
        .textLayer .word-highlight:hover {
          background-color: rgba(250, 204, 21, 0.4); /* yellow-400 equivalent */
          mix-blend-mode: multiply;
          border-radius: 4px;
          box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.4);
          backdrop-filter: brightness(0.95);
        }
      `}} />
    </div>
  );
};

export default PdfVisualReader;
