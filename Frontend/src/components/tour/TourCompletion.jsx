import { useEffect } from 'react';
import { useTourStore } from '../../store/tourStore';
import { onboardingAudio } from '../../utils/onboardingAudio';
import { triggerConfetti } from '../../utils/confetti';
import { useAuthStore } from '../../store/authStore';
import { Trophy, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export const TourCompletion = () => {
  const { isTourActive, status, endTour } = useTourStore();
  const { addXp } = useAuthStore();

  useEffect(() => {
    if (isTourActive && status === 'COMPLETED') {
      onboardingAudio.playVictory();
      triggerConfetti();
      if (addXp) addXp(50);
    }
  }, [isTourActive, status, addXp]);

  if (!isTourActive || status !== 'COMPLETED') return null;

  const handleClose = () => {
    endTour(true);
  };

  const checklist = [
    "Theo dõi tiến trình học tập & chuỗi Streak",
    "Thiết lập mục tiêu phút học hàng ngày",
    "Sử dụng đồng hồ Pomodoro tập trung",
    "Đọc tài liệu & 1-click tra từ Tiếng Trung",
    "Quản lý Sổ tay từ vựng cá nhân",
    "Luyện tập Flashcards 3D & Thuật toán SRS"
  ];

  return (
    <div className="fixed inset-0 z-[100005] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300 pointer-events-auto font-sans">
      <div className="bg-white border border-slate-100 shadow-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 relative overflow-hidden">
        
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-yellow-400/20 via-blue-500/10 to-transparent rounded-full blur-2xl pointer-events-none"></div>

        {/* Trophy Badge Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-orange-500/30 animate-bounce">
          <Trophy className="w-10 h-10 text-white drop-shadow-sm" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
            HOÀN THÀNH PRODUCT TOUR
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-850 tracking-tight">
            🎉 CHÚC MỪNG!
          </h3>
          <p className="text-xs text-slate-500 font-bold">
            Bạn đã hoàn thành hướng dẫn sử dụng website Hanora.
          </p>
        </div>

        {/* Summary Checklist */}
        <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl text-left space-y-2 max-h-48 overflow-y-auto">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
            Bạn đã biết cách:
          </span>
          {checklist.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-slate-750">{item}</span>
            </div>
          ))}
        </div>

        {/* XP Reward Badge */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-3 rounded-2xl flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          <span className="text-sm font-black text-blue-700">+50 XP Thưởng Hoàn Thành</span>
        </div>

        {/* Action Button */}
        <button
          onClick={handleClose}
          className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-black rounded-2xl text-sm shadow-md hover:opacity-95 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Bắt đầu học ngay 🚀</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};
