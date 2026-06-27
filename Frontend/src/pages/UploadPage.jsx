import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDocument, getDocument } from '../lib/api';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [status, setStatus] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
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
            navigate(`/reader/${processingId}`);
          } else if (doc.status === 'Failed' || doc.status === 'failed' || doc.status === 2) {
            clearInterval(interval);
            setStatus('Failed to process document.');
          }
        } catch (error) {
          console.error(error);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [processingId, navigate]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
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
    
    if (isUploading || processingId) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setStatus('Uploading...');
    try {
      const response = await uploadDocument(file);
      setProcessingId(response.id);
      setStatus('Processing (OCR in progress)...');
    } catch (error) {
      console.error(error);
      setStatus('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Tải lên Tài liệu</h1>
        
        <div 
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragActive 
              ? 'border-blue-500 bg-blue-100' 
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            disabled={isUploading || processingId}
          />
          <label htmlFor="file-upload" className={`flex flex-col items-center ${isUploading || processingId ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragActive ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <span className="text-sm text-gray-600">
              {file ? file.name : "Kéo thả hoặc nhấn để chọn file (PDF, JPG, PNG)"}
            </span>
          </label>
        </div>

        {file && !processingId && (
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full mt-6 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {isUploading ? 'Đang tải lên...' : 'Bắt đầu xử lý'}
          </button>
        )}

        {status && (
          <div className="mt-6 text-center">
            <p className="text-sm font-medium text-gray-700">{status}</p>
            {processingId && status !== 'Failed' && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4 overflow-hidden">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse w-full"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
