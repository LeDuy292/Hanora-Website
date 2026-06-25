import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getDocument, getVocabulary, getMyDocuments } from '../lib/api';
import WordCard from '../components/WordCard';
import UploadModal from '../components/UploadModal';
import { DocumentSelectModal } from '../components/DocumentSelectModal';
import { useNavigate } from 'react-router-dom';
import { pinyin } from 'pinyin-pro';
import PdfVisualReader from '../components/reader/PdfVisualReader';

const ReaderPage = () => {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [segments, setSegments] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);
  const [vocabData, setVocabData] = useState(null);
  const [isLoadingVocab, setIsLoadingVocab] = useState(false);
  const [fontSize, setFontSize] = useState(28);
  const [showPinyin, setShowPinyin] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(!id);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [documentsList, setDocumentsList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const readerContainerRef = React.useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      setDocument(null);
      setSegments([]);
      setCurrentPage(1);
      return;
    }
    const fetchDoc = async () => {
      try {
        const doc = await getDocument(id);
        setDocument(doc);
        setCurrentPage(1);
        if (doc.extractedText) {
          const parsed = JSON.parse(doc.extractedText);
          setSegments(parsed);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchDoc();
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

  // Use a ref to track poll count across re-renders so we don't reset it when vocabData updates
  const pollCountRef = React.useRef(0);

  // Reset poll count when a new word is selected
  useEffect(() => {
    pollCountRef.current = 0;
  }, [selectedWord]);

  // Silent polling to check if background AI translation/relations have finished
  useEffect(() => {
    let timeoutId;
    const MAX_POLLS = 4; // Max 12 seconds of polling
    
    const checkUpdates = async () => {
      if (!selectedWord || !vocabData) return;
      if (pollCountRef.current >= MAX_POLLS) return;
      
      // Check if we need to poll (missing viText in examples, or empty relations)
      const needsTranslation = vocabData.examples?.some(ex => ex.enText && !ex.viText);
      const missingRelations = (!vocabData.synonyms || vocabData.synonyms.length === 0) && 
                              (!vocabData.antonyms || vocabData.antonyms.length === 0) &&
                              (!vocabData.compounds || vocabData.compounds.length === 0);
                              
      // Only poll for a few times, so we don't spam the server indefinitely if it's genuinely empty
      if (needsTranslation || missingRelations) {
        timeoutId = setTimeout(async () => {
          try {
            pollCountRef.current++;
            const freshData = await getVocabulary(selectedWord);
            setVocabData(freshData); // Update silently without showing loading indicator
          } catch (e) {
            console.error("Failed to poll vocabulary updates", e);
          }
        }, 3000);
      }
    };
    
    checkUpdates();
    
    return () => clearTimeout(timeoutId);
  }, [vocabData, selectedWord]);

  const handleWordClick = async (word) => {
    // Skip spaces or punctuation if needed
    if (!word || word.trim() === '') return;
    
    setSelectedWord(word);
    setVocabData(null);
    setIsLoadingVocab(true);

    try {
      const data = await getVocabulary(word);
      setVocabData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingVocab(false);
    }
  };

  const closeWordCard = () => {
    setSelectedWord(null);
    setVocabData(null);
  };

  const WORDS_PER_PAGE = 500;
  const totalPages = Math.ceil(segments.length / WORDS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const currentSegments = segments.slice((validCurrentPage - 1) * WORDS_PER_PAGE, validCurrentPage * WORDS_PER_PAGE);

  const isPdfDocument = document?.fileUrl?.toLowerCase().includes('.pdf') || document?.title?.toLowerCase().endsWith('.pdf');

  return (
    <div className="min-h-screen bg-[#f4f7fc] flex flex-col font-sans">
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
      />

      {/* Top Navigation Bar */}
      <div className="bg-white rounded-3xl lg:rounded-full mx-4 md:mx-8 mt-4 md:mt-6 px-4 md:px-6 py-3.5 md:py-3 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <span className="text-gray-500 font-bold text-xs md:text-sm tracking-wider uppercase ml-1 sm:ml-2 shrink-0">VĂN BẢN ĐỌC:</span>

          <div className="relative">
            <button 
              onClick={() => setIsSelectModalOpen(true)}
              className="flex items-center justify-between w-full sm:w-64 bg-gray-50 border border-gray-200 text-gray-800 text-sm font-medium rounded-full px-5 py-2 focus:outline-none hover:bg-gray-100 transition-colors"
            >
              <span className="truncate">
                {id ? documentsList.find(d => d.id == id)?.title || 'Đang tải...' : 'Chưa chọn tài liệu'}
              </span>
              <svg className="w-4 h-4 text-gray-500 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-full text-sm font-medium transition-colors border border-blue-100 w-full sm:w-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Tải file mới
          </button>
        </div>
        
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3">
          <button 
            onClick={() => setShowPinyin(!showPinyin)}
            className={`flex-grow sm:flex-grow-0 justify-center flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${showPinyin ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            Pinyin
          </button>
          <div className="flex-grow sm:flex-grow-0 justify-between flex items-center bg-gray-50 border border-gray-200 rounded-full overflow-hidden p-0.5">
            <button onClick={() => setFontSize(Math.max(16, fontSize - 2))} className="px-3 py-1.5 hover:bg-white rounded-full text-gray-600 font-medium transition-colors">A-</button>
            <span className="px-3 py-1.5 text-sm font-bold text-gray-800">{fontSize}px</span>
            <button onClick={() => setFontSize(Math.min(48, fontSize + 2))} className="px-3 py-1.5 hover:bg-white rounded-full text-gray-600 font-medium transition-colors">A+</button>
          </div>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row flex-1 p-4 md:p-8 gap-4 md:gap-8 overflow-hidden h-auto lg:h-[calc(100vh-220px)]">
        
        {/* Left: Document Reader */}
        <div 
          className="w-full lg:w-[65%] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative flex flex-col h-[55vh] lg:h-full"
        >
          {!document && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">Chưa có tài liệu nào được chọn</h2>
              <p className="text-gray-500 mb-8 max-w-md">Vui lòng tải lên một tài liệu tiếng Trung (PDF, ảnh) hoặc chọn một tài liệu từ danh sách để bắt đầu đọc và tra cứu.</p>
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-colors"
              >
                Tải lên tài liệu ngay
              </button>
            </div>
          )}

          {document && (
            <div className="flex-grow flex flex-col h-full max-w-4xl mx-auto w-full pt-6 sm:pt-10 pb-6 px-4 sm:px-12 overflow-hidden">
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 text-center leading-snug shrink-0 break-all">{document.title}</h1>
              
              <div 
                ref={readerContainerRef}
                className="flex-1 text-gray-800 font-sans tracking-wide break-words text-justify overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
                style={{ fontSize: `${fontSize}px`, lineHeight: '2.5' }}

              >
                Tải lên tài liệu khác
              </button>
            </div>
          ) : document && document.status === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 border border-blue-100 animate-pulse">
                <svg className="w-10 h-10 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </div>
              <h2 className="text-2xl font-bold text-blue-700 mb-2">Đang xử lý tài liệu...</h2>
              <p className="text-blue-500 max-w-md font-medium">Hệ thống đang trích xuất văn bản và nhận diện từ vựng. Quá trình này có thể mất vài phút.</p>
            </div>
          ) : document ? (
            <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
              {isPdfDocument ? (
                <PdfVisualReader 
                  fileUrl={document.fileUrl} 
                  onWordClick={handleWordClick} 
                />
              ) : (
                <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full pt-10 pb-6 px-12 overflow-hidden">
                  <h1 className="text-4xl font-bold text-gray-900 mb-6 text-center leading-snug shrink-0">{document.title}</h1>
                  
                  <div 
                    ref={readerContainerRef}
                    className="flex-1 text-gray-800 font-sans tracking-wide break-words text-justify overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
                    style={{ fontSize: `${fontSize}px`, lineHeight: '2.5' }}
                  >
                    {currentSegments.map((word, index) => (
                      <span
                        key={index}
                        onClick={() => handleWordClick(word)}
                        className={`inline-flex flex-col items-center justify-end cursor-pointer rounded-lg px-1.5 mx-0.5 transition-all duration-200 ${selectedWord === word ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300' : 'hover:bg-blue-50 hover:text-blue-700'} align-bottom`}
                      >
                        <span className="leading-none">{word}</span>
                        {showPinyin && (
                          <span className="text-[0.4em] text-gray-500 font-normal leading-none mt-1.5 select-none text-center">
                            {pinyin(word, { type: 'string' })}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-4 shrink-0 flex flex-col items-center justify-center border-t border-gray-100 pt-4 pb-2">
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
          ) : null}
        </div>

        {/* Right: Side Panel */}
        <div className="w-full lg:w-[35%] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-y-auto flex-shrink-0 relative h-[40vh] lg:h-full">

          {!selectedWord ? (
            <div className="flex flex-col items-center justify-center p-10 text-center min-h-[300px]">
              <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4">Tra cứu tương tác</h3>
              <p className="text-gray-500 text-sm leading-relaxed max-w-[280px] mx-auto">
                Nhấp chuột vào bất kỳ chữ Hán nào trong văn bản để xem phiên âm Pinyin, định nghĩa tiếng Việt, lưu vào sổ tay cá nhân hoặc tra cứu ngữ pháp AI.
              </p>
            </div>
          ) : (
            <div className="p-8">
              <button 
                onClick={closeWordCard}
                className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <WordCard 
                word={selectedWord} 
                data={vocabData} 
                isLoading={isLoadingVocab}
                onWordClick={handleWordClick}
                documentId={id}
                documentTitle={document?.title}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReaderPage;
