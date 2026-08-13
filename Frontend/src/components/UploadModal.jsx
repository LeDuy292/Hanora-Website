import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDocument, getDocument } from '../lib/api';
import { toast } from '../store/notificationStore';
import { formatFileSize, UPLOAD_RULE_TEXT, validateUploadFile } from '../utils/uploadRules';

const UploadModal = ({ isOpen, onClose }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [status, setStatus] = useState('');
  const [isFailed, setIsFailed] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let interval;
    if (processingId && !isFailed) {
      interval = setInterval(async () => {
        try {
          const doc = await getDocument(processingId);
          setStatus(doc.status);
          
          // Backend enums: Ready=4, Failed=5
          if (doc.status === 'Ready' || doc.status === 'ready' || doc.status === 4) {
            clearInterval(interval);
            onClose();
            navigate(`/reader/${processingId}`);
          } else if (doc.status === 'Failed' || doc.status === 'failed' || doc.status === 5) {
            clearInterval(interval);
            setStatus(doc.processingError || doc.extractedText || 'Lỗi xử lý tài liệu.');
            setIsFailed(true);
          }
        } catch (error) {
          console.error(error);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [processingId, isFailed, navigate, onClose]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setIsUploading(false);
      setProcessingId(null);
      setStatus('');
      setIsFailed(false);
      setIsDragActive(false);
      setUploadProgress(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectFile = (nextFile) => {
    const validationError = validateUploadFile(nextFile);
    setProcessingId(null);
    setUploadProgress(0);

    if (validationError) {
      setFile(null);
      setStatus(validationError);
      setIsFailed(true);
      return;
    }

    setFile(nextFile);
    setIsFailed(false);
    setStatus('');
  };
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      selectFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (isUploading || (processingId && !isFailed)) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      selectFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setStatus('Đang tải lên...');
    setUploadProgress(0);
    setIsFailed(false);
    try {
      const response = await uploadDocument(file, { onProgress: setUploadProgress });
      setProcessingId(response.id);
      setStatus('Hệ thống đang xử lý OCR...');
    } catch (error) {
      console.error('[UploadModal] Upload error:', error);
      const msg = error?.message || String(error) || 'Tải lên thất bại.';
      setStatus(msg);
      setIsFailed(true);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 pt-20 sm:pt-24 overflow-y-auto">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-6 sm:p-8 relative animate-scale-in max-h-[85vh] overflow-y-auto flex flex-col my-auto">
        <button 
          onClick={onClose}
          disabled={isUploading || (processingId && !isFailed)}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Tải lên tài liệu</h2>
        
        <div 
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
            isDragActive 
              ? 'border-blue-500 bg-blue-100' 
              : 'border-blue-200 bg-blue-50/30 hover:bg-blue-50'
          }`}
        >
          <input
            type="file"
            accept=".pdf,.docx,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            disabled={isUploading || (processingId && !isFailed)}
          />
          <label htmlFor="file-upload" className={`flex flex-col items-center ${isUploading || (processingId && !isFailed) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragActive ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-500'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 mb-1 break-all">
              {file ? file.name : "Kéo thả hoặc nhấn để chọn tài liệu"}
            </span>
            {file && (
              <span className="text-xs font-semibold text-gray-500 mb-1">{formatFileSize(file.size)}</span>
            )}
            <span className="text-xs text-gray-500">
              {UPLOAD_RULE_TEXT}
            </span>
          </label>
        </div>

        {file && (!processingId || isFailed) && (
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className={`w-full mt-6 text-white font-bold py-3.5 rounded-2xl transition-colors disabled:bg-gray-400 shadow-md ${
              isFailed ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
            }`}
          >
            {isUploading ? 'Đang tải lên...' : isFailed ? 'Thử lại' : 'Bắt đầu xử lý'}
          </button>
        )}

        {(isUploading || (processingId && !isFailed)) && (
          <div className="mt-6 flex-1 flex flex-col space-y-4 font-sans text-left">
            {/* 4-Step Progress Stepper */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1">Tiến trình xử lý tài liệu</span>
              
              <div className="space-y-2">
                {[
                  { step: 0, title: 'Đang tải tài liệu', desc: 'Chuyển tệp và khởi tạo dữ liệu' },
                  { step: 1, title: 'Đang nhận diện chữ Hán', desc: 'OCR bóc tách ký tự tiếng Trung' },
                  { step: 2, title: 'Đang phân tích nội dung', desc: 'Phân tách từ vựng & bố cục' },
                  { step: 3, title: 'Hoàn tất', desc: 'Sẵn sàng trong giao diện Reader' }
                ].map((item) => {
                  const getStepIndex = (st) => {
                    const s = String(st || '').toLowerCase();
                    if (s === 'ready' || s === '4') return 3;
                    if (s === 'analyzingcontent' || s === '3') return 2;
                    if (s === 'recognizingocr' || s === 'ocr' || s === '2') return 1;
                    if (s === 'processing' || s === '1') return 1;
                    return 0; // Uploading
                  };
                  const currentStepIdx = isUploading ? 0 : getStepIndex(status);
                  const isDone = item.step < currentStepIdx;
                  const isCurrent = item.step === currentStepIdx;

                  return (
                    <div key={item.step} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                        isDone 
                          ? 'bg-emerald-500 text-white' 
                          : isCurrent 
                          ? 'bg-blue-600 text-white animate-pulse' 
                          : 'bg-slate-200 text-slate-400'
                      }`}>
                        {isDone ? '✓' : item.step + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-extrabold line-clamp-1 ${isCurrent ? 'text-blue-600' : isDone ? 'text-slate-700' : 'text-slate-400'}`}>
                          {item.title}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {isUploading && (
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-2">
                  <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>

            {/* Leave page & receive notification button */}
            <button
              onClick={() => {
                toast.info('Tài liệu đang được xử lý ở nền. Bạn sẽ nhận được thông báo ngay khi hoàn tất!');
                onClose();
              }}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200/70 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200 flex items-center justify-center gap-2"
            >
              <span>🔔 Rời trang & nhận thông báo khi hoàn tất</span>
            </button>
          </div>
        )}

        {isFailed && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
            <p className="text-xs font-bold text-rose-700">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadModal;
