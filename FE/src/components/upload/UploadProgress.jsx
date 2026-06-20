import { useState, useEffect } from 'react';
import { Sparkles, BrainCircuit } from 'lucide-react';

const STEPS = [
  "Đang đọc dữ liệu luồng ký tự...",
  "Đang áp dụng thuật toán phân tách từ Maximum-Matching...",
  "Đang truy vấn cơ sở dữ liệu từ điển HSK...",
  "Đang ghép phiên âm Pinyin Hán ngữ...",
  "Đang tổng hợp thống kê cấp độ HSK và mật độ chữ...",
  "Đang chuẩn bị trình đọc tương tác thông minh..."
];

export function UploadProgress({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress up to 100
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 15) + 5;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 300); // call callback shortly after completion
          return 100;
        }
        return next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [onComplete]);

  // Derive current step text directly during rendering to avoid useEffect setState warning
  const stepIndex = Math.min(
    Math.floor((progress / 100) * STEPS.length),
    STEPS.length - 1
  );
  const currentStep = STEPS[stepIndex];

  return (
    <div className="bg-white border border-slate-100 p-8 rounded-3xl text-center space-y-6 max-w-md mx-auto shadow-md page-transition">
      <div className="relative w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-650 mx-auto">
        <BrainCircuit className="w-7 h-7 animate-pulse-subtle" />
        <div className="absolute inset-0 border border-blue-500/30 rounded-2xl animate-ping opacity-25"></div>
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-800 flex items-center justify-center gap-1.5">
          <Sparkles className="w-4.5 h-4.5 text-blue-500 fill-blue-500/5" />
          Trình phân tích Văn bản AI
        </h3>
        <p className="text-xs text-slate-500 font-semibold">{currentStep}</p>
      </div>

      {/* Progress Bar Container */}
      <div className="space-y-2">
        <div className="h-2 bg-slate-100 border border-slate-150 rounded-full overflow-hidden relative">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full transition-all duration-300 shadow-sm"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 tracking-wider">
          <span>Đang xử lý...</span>
          <span className="text-blue-600">{progress}%</span>
        </div>
      </div>
    </div>
  );
}
export default UploadProgress;
