import React, { useState } from 'react';
import { FileText, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { formatDate } from '../utils/formatDate';

export const DocumentSelectModal = ({ isOpen, onClose, documents, onSelect, currentId }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  if (!isOpen) return null;

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(filteredDocs.length / ITEMS_PER_PAGE) || 1;
  
  const validCurrentPage = Math.min(currentPage, totalPages);
  
  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const currentDocs = filteredDocs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl p-6 relative animate-scale-in flex flex-col max-h-[85vh]">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <FileText className="text-blue-500" />
          Chọn tài liệu dịch thuật
        </h2>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Tìm kiếm tài liệu..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px] mb-4 space-y-2 pr-1">
          {currentDocs.length > 0 ? (
            currentDocs.map(doc => (
              <div 
                key={doc.id}
                onClick={() => {
                  onSelect(doc.id);
                  onClose();
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  currentId == doc.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                }`}
              >
                <div>
                  <h4 className={`font-semibold text-sm ${currentId == doc.id ? 'text-blue-700' : 'text-gray-800'}`}>
                    {doc.title}
                  </h4>
                  <span className="text-xs text-gray-500 mt-1 block">
                    Đã tải lên: {formatDate(doc.createdAt || doc.date || new Date().toISOString())}
                  </span>
                </div>
                {currentId == doc.id && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-md">
                    Đang đọc
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
              <FileText className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">Không tìm thấy tài liệu nào</p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
            <span className="text-xs text-gray-500 font-medium">
              Trang {validCurrentPage} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={validCurrentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
