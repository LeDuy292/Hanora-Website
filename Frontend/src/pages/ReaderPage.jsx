import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, HelpCircle, ArrowLeft } from 'lucide-react';
import { useReaderStore } from '../store/readerStore';
import { useDocumentStore } from '../store/documentStore';
import { useVocabularyStore } from '../store/vocabularyStore';
import { ReadingToolbar } from '../components/reader/ReadingToolbar';
import { ReaderContent } from '../components/reader/ReaderContent';
import { WordPopup } from '../components/reader/WordPopup';
import { SentencePopup } from '../components/reader/SentencePopup';
import { UploadZone } from '../components/upload/UploadZone';
import { FilePreview } from '../components/upload/FilePreview';
import { UploadProgress } from '../components/upload/UploadProgress';
import { readFileAsText } from '../utils/fileHelper';
import { Button } from '../components/common/Button';
import { THEMES } from '../utils/constants';

export function ReaderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, selectedWord, setSelectedWord, selectedSentence, setSelectedSentence, clearSelection } = useReaderStore();
  const { getActiveDocument, documents, addDocument } = useDocumentStore();
  const { addWord, isWordSaved } = useVocabularyStore();

  // Integrated Upload State
  const [showUpload, setShowUpload] = useState(false);
  const [uploadStep, setUploadStep] = useState('upload'); // upload, preview, progress
  const [fileObject, setFileObject] = useState(null);
  const [fileText, setFileText] = useState('');

  const activeDoc = getActiveDocument();

  // Check if Dashboard passed state to open the upload view directly
  useEffect(() => {
    if (location.state?.openUpload) {
      const timer = setTimeout(() => {
        setShowUpload(true);
        setUploadStep('upload');
      }, 0);
      window.history.replaceState({}, document.title);
      return () => clearTimeout(timer);
    }
  }, [location]);

  // Clear selections when reader page unmounts
  useEffect(() => {
    return () => clearSelection();
  }, [clearSelection]);

  const handleFileSelect = async (file) => {
    try {
      const text = await readFileAsText(file);
      setFileObject(file);
      setFileText(text);
      setUploadStep('preview');
    } catch (err) {
      console.error("Failed to read file:", err);
    }
  };

  const handleConfirmUpload = (title) => {
    setUploadStep('progress');
    setFileObject(prev => ({ ...prev, customTitle: title }));
  };

  const handleProgressComplete = () => {
    addDocument(fileObject.customTitle || fileObject.name, fileText);
    setShowUpload(false);
    setUploadStep('upload');
    setFileObject(null);
    setFileText('');
  };

  const handleSaveWord = (word) => {
    addWord({
      ...word,
      documentTitle: activeDoc ? activeDoc.title : undefined,
      documentId: activeDoc ? activeDoc.id : undefined,
    });
  };

  const getThemeClass = () => {
    return THEMES[theme]?.class || THEMES.light.class;
  };

  // Render Integrated File Upload Screens
  if (documents.length === 0 || showUpload) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 py-6 page-transition">
        {/* Dynamic header depending on document count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold font-display text-slate-800">
              {documents.length === 0 ? 'Tải lên tài liệu học' : 'Nhập tài liệu mới'}
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Tải lên tệp tin văn bản (.txt) hoặc tài liệu PDF (.pdf) tiếng Trung. Hệ thống sẽ tự phân tích HSK, từ vựng và tạo phiên âm Pinyin.
            </p>
          </div>

          {/* Only show back option if they already have other files to read */}
          {documents.length > 0 && (
            <button
              onClick={() => setShowUpload(false)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl transition-all self-start"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại trình đọc</span>
            </button>
          )}
        </div>

        {/* Upload Wizard steps */}
        <div className="page-transition">
          {uploadStep === 'upload' && (
            <UploadZone onFileSelect={handleFileSelect} />
          )}

          {uploadStep === 'preview' && (
            <FilePreview
              file={fileObject}
              text={fileText}
              onConfirm={handleConfirmUpload}
              onCancel={() => setUploadStep('upload')}
            />
          )}

          {uploadStep === 'progress' && (
            <UploadProgress onComplete={handleProgressComplete} />
          )}
        </div>
      </div>
    );
  }

  // Render Reader Workspace
  return (
    <div className="h-full flex flex-col gap-6 max-w-7xl mx-auto page-transition">
      {/* Reading toolbar with active upload toggle */}
      <ReadingToolbar onUploadClick={() => setShowUpload(true)} />

      {/* Main Grid: Reading Canvas (left) vs Inspection Sidebar (right) */}
      {activeDoc ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start flex-1 min-h-[calc(100vh-14rem)]">

          {/* Reading viewport (2 columns width) */}
          <div className="lg:col-span-2 flex justify-center items-start min-h-[600px]">
            <div className={`w-full max-w-[760px] md:min-h-[1075px] rounded-2xl p-10 md:p-16 shadow-[0_15px_45px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] border border-slate-200/50 transition-all duration-300 ${getThemeClass()}`}>
              <h1 className="text-2xl md:text-3xl font-extrabold text-center mb-10 text-slate-800 tracking-tight leading-normal">
                {activeDoc.title}
              </h1>
              <ReaderContent content={activeDoc.content} />
            </div>
          </div>

          {/* Inspection sidebar panel (1 column width) */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-20">
            {selectedWord ? (
              <WordPopup
                word={selectedWord}
                onSave={handleSaveWord}
                isSaved={isWordSaved(selectedWord.text)}
                onClose={() => setSelectedWord(null)}
              />
            ) : null}

            {selectedSentence ? (
              <SentencePopup
                sentence={selectedSentence}
                onClose={() => setSelectedSentence(null)}
              />
            ) : null}

            {!selectedWord && !selectedSentence && (
              <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center space-y-4 flex flex-col items-center justify-center min-h-[260px] shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 animate-pulse-subtle" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tra cứu tương tác</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto font-medium">
                    Nhấp chuột vào bất kỳ chữ Hán nào trong văn bản để xem phiên âm Pinyin, định nghĩa tiếng Anh, lưu vào sổ tay cá nhân hoặc tra cứu ngữ pháp AI.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Fallback empty reader card */
        <div className="max-w-md mx-auto text-center p-8 bg-white border border-slate-100 rounded-3xl space-y-6 my-12 shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-850 mb-1" style={{ color: '#1e293b' }}>Chọn hoặc Tải văn bản</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Bạn chưa chọn tài liệu học nào. Hãy tải lên tệp tin hoặc chọn một tệp có sẵn để bắt đầu.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="primary" onClick={() => setShowUpload(true)}>
              Tải Lên Tài Liệu
            </Button>
            <Button variant="secondary" onClick={() => navigate('/dashboard')}>
              Về Trang Chủ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
export default ReaderPage;
