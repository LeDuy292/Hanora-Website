import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getDocument, getVocabulary, getMyDocuments } from '../lib/api';
import WordCard from '../components/WordCard';
import UploadModal from '../components/UploadModal';
import { useNavigate } from 'react-router-dom';

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
  const [documentsList, setDocumentsList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      setDocument(null);
      setSegments([]);
      return;
    }
    const fetchDoc = async () => {
      try {
        const doc = await getDocument(id);
        setDocument(doc);
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

  return (
    <div className="min-h-screen bg-[#f4f7fc] flex flex-col font-sans">
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />

      {/* Top Navigation Bar */}
      <div className="bg-white rounded-full mx-8 mt-6 px-6 py-3 flex items-center justify-between shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <span className="text-gray-500 font-bold text-sm tracking-wider uppercase ml-2">VĂN BẢN ĐỌC:</span>
          <div className="relative">
            <select 
              className="appearance-none bg-gray-50 border border-gray-200 text-gray-800 text-sm font-medium rounded-full px-5 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100 transition-colors cursor-pointer"
              value={id || ''}
              onChange={(e) => {
                if (e.target.value) {
                  navigate(`/reader/${e.target.value}`);
                } else {
                  navigate(`/reader`);
                }
              }}
            >
              <option value="">Chưa chọn tài liệu</option>
              {documentsList.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.title}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-full text-sm font-medium transition-colors border border-blue-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Tải file mới
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowPinyin(!showPinyin)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${showPinyin ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            Pinyin
          </button>
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full overflow-hidden p-0.5">
            <button onClick={() => setFontSize(Math.max(16, fontSize - 2))} className="px-3 py-1.5 hover:bg-white rounded-full text-gray-600 font-medium transition-colors">A-</button>
            <span className="px-3 py-1.5 text-sm font-bold text-gray-800">{fontSize}px</span>
            <button onClick={() => setFontSize(Math.min(48, fontSize + 2))} className="px-3 py-1.5 hover:bg-white rounded-full text-gray-600 font-medium transition-colors">A+</button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 p-8 gap-8 overflow-hidden h-[calc(100vh-90px)]">
        
        {/* Left: Document Reader */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-y-auto relative">
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
            <div className="max-w-3xl mx-auto p-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-12 text-center leading-snug">{document.title}</h1>
              
              <div 
                className="text-gray-800 font-sans tracking-wide break-words text-justify"
                style={{ fontSize: `${fontSize}px`, lineHeight: '2.5' }}
              >
                {segments.map((word, index) => (
                  <span
                    key={index}
                    onClick={() => handleWordClick(word)}
                    className={`cursor-pointer rounded-lg px-1.5 mx-0.5 transition-all duration-200 ${selectedWord === word ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300' : 'hover:bg-blue-50 hover:text-blue-700'}`}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Side Panel */}
        <div className="w-[420px] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-y-auto flex-shrink-0 relative">
          {!selectedWord ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center">
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
