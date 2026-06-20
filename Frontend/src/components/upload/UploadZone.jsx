import { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export function UploadZone({ onFileSelect }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const validateFile = (file) => {
    if (!file) return false;
    
    // Check extension (support .txt and .pdf)
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (fileExtension !== 'txt' && fileExtension !== 'pdf') {
      setError('Chỉ hỗ trợ tệp tài liệu dạng văn bản (.txt) hoặc tài liệu PDF (.pdf).');
      setSelectedFile(null);
      return false;
    }
    
    // Check size limit (max 5MB to keep client-side rendering fast)
    if (file.size > 5 * 1024 * 1024) {
      setError('Tệp tin quá lớn. Dung lượng tối đa được phép là 5MB.');
      setSelectedFile(null);
      return false;
    }

    setError('');
    setSelectedFile(file);
    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Upload Drag Card */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`w-full border-2 border-dashed rounded-3xl p-10 text-center flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 ${
          isDragActive
            ? 'border-blue-500 bg-blue-50/50 shadow-md shadow-blue-500/5'
            : 'border-slate-200 bg-white hover:bg-slate-50/55 hover:border-slate-350 shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{selectedFile.name}</p>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Tài liệu đã chọn
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center shadow-inner group-hover:text-slate-500">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Kéo & thả tệp tin của bạn tại đây</p>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                hoặc nhấp chuột để tìm duyệt từ máy tính
              </p>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 block">
              Hỗ trợ định dạng .txt, .pdf lên đến 5MB
            </span>
          </div>
        )}
      </div>

      {/* Error alert banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-500 rounded-xl text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
export default UploadZone;
