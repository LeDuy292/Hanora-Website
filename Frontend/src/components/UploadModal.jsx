import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDocument, getDocument } from '../lib/api';

const UploadModal = ({ isOpen, onClose }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let interval;
    if (processingId) {
      interval = setInterval(async () => {
        try {
          const doc = await getDocument(processingId);
          setStatus(doc.status);
          
          if (doc.status === 'Ready' || doc.status === 'Ready' || doc.status === 'ready' || doc.status === 1) { // checking various casing/enums
            clearInterval(interval);
            onClose(); // close modal
            navigate(`/reader/${processingId}`);
          } else if (doc.status === 'Failed' || doc.status === 'failed' || doc.status === 2) {
            clearInterval(interval);
            setStatus(doc.extractedText || 'Lỗi xử lý tài liệu.');
          }
        } catch (error) {
          console.error(error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [processingId, navigate, onClose]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setIsUploading(false);
      setProcessingId(null);
      setStatus('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setStatus('Đang tải lên...');
    try {
      const response = await uploadDocument(file);
      setProcessingId(response.id);
      setStatus('Hệ thống đang xử lý OCR...');
    } catch (error) {
      console.error(error);
      setStatus('Tải lên thất bại.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 relative animate-scale-in">
        <button 
          onClick={onClose}
          disabled={isUploading || processingId}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Tải lên tài liệu</h2>
        
        <div className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-2xl p-8 text-center hover:bg-blue-50 transition-colors">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            disabled={isUploading || processingId}
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 mb-1">
              {file ? file.name : "Kéo thả hoặc nhấn để chọn file"}
            </span>
            <span className="text-xs text-gray-500">
              Hỗ trợ PDF, JPG, PNG
            </span>
          </label>
        </div>

        {file && !processingId && (
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full mt-8 bg-blue-600 text-white font-semibold py-3.5 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-gray-400 shadow-md hover:shadow-lg shadow-blue-600/20"
          >
            {isUploading ? 'Đang tải lên...' : 'Bắt đầu xử lý'}
          </button>
        )}

        {status && (
          <div className="mt-8 text-center">
            <p className="text-sm font-medium text-gray-700 mb-4">{status}</p>
            {processingId && status !== 'Failed' && (
              <div className="w-full bg-blue-50 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse w-full"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadModal;
