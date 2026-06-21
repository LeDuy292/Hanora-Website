import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDocument, getDocument } from '../lib/api';

const UploadPage = () => {
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
            navigate(`/reader/${processingId}`);
          } else if (doc.status === 'Failed' || doc.status === 'failed' || doc.status === 2) {
            clearInterval(interval);
            setStatus('Failed to process document.');
          }
        } catch (error) {
          console.error(error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [processingId, navigate]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
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
        
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            disabled={isUploading || processingId}
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
            <svg className="w-12 h-12 text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
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
