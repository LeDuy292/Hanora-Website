import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingStore } from '../../store/onboardingStore';
import { onboardingAudio } from '../../utils/onboardingAudio';
import { 
  Sparkles, 
  X, 
  MousePointerClick,
  ChevronRight,
  Trophy,
  Volume2,
  VolumeX
} from 'lucide-react';
import streakBadgeImg from '../../assets/StreakImage.png';

export const OnboardingTourModal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, addXp } = useAuthStore();
  const { isOpen, currentStep, openTour, closeTour, nextStep, prevStep } = useOnboardingStore();

  const [targetRect, setTargetRect] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);

  const steps = [
    // --- TRANG 1: TIẾN TRÌNH / BẢNG ĐIỀU KHIỂN ---
    {
      page: '/dashboard',
      badge: "TRANG 1/4: TIẾN TRÌNH",
      selector: '[data-tour="header-banner"]',
      fallbackSelector: 'main',
      title: "Bảng Điều Khiển Học Tập",
      speech: "Chào mừng bạn! Đây là Bảng Điều Khiển theo dõi Level, XP và Mục Tiêu Học Tập hàng ngày.",
      actionHint: "👉 Nhấp 'Tiếp theo' hoặc nhấp vào mục Dịch thuật trên Menu để sang bước tiếp"
    },
    {
      page: '/dashboard',
      badge: "CHUYỂN SANG DỊCH THUẬT",
      selector: '[data-tour-nav="/reader"]',
      fallbackSelector: '.hanora-site-header',
      title: "Mở Trang Dịch Thuật",
      speech: "👉 Nhấp vào mục 'Dịch thuật' trên thanh Menu Header để sang trang đọc tài liệu & tra từ!",
      actionHint: "👉 Bấm trực tiếp vào mục 'Dịch thuật' trên thanh Menu Header",
      autoNavigate: '/reader'
    },

    // --- TRANG 2: DỊCH THUẬT & ĐỌC TÀI LIỆU ---
    {
      page: '/reader',
      badge: "TRANG 2/4: DỊCH THUẬT",
      selector: 'main',
      fallbackSelector: '.hanora-site-header',
      title: "Trang Dịch Thuật & Đọc Sách",
      speech: "Trang Dịch Thuật giúp bạn đọc file PDF/văn bản Tiếng Trung và nhấp 1-click tra Pinyin, Hán Việt & Lưu từ!",
      actionHint: "👉 Xem tính năng Đọc Dịch và bấm Tiếp theo để sang trang Từ Vựng"
    },
    {
      page: '/reader',
      badge: "CHUYỂN SANG TỪ VỰNG",
      selector: '[data-tour-nav="/vocabulary"]',
      fallbackSelector: '.hanora-site-header',
      title: "Mở Trang Từ Vựng",
      speech: "👉 Bây giờ hãy nhấp vào mục 'Từ vựng' trên Menu để mở Sổ tay từ vựng của bạn!",
      actionHint: "👉 Bấm trực tiếp vào mục 'Từ vựng' trên thanh Menu Header",
      autoNavigate: '/vocabulary'
    },

    // --- TRANG 3: SỔ TAY TỪ VỰNG ---
    {
      page: '/vocabulary',
      badge: "TRANG 3/4: TỪ VỰNG",
      selector: 'main',
      fallbackSelector: '.hanora-site-header',
      title: "Sổ Tay Từ Vựng Cá Nhân",
      speech: "Đây là Sổ Tay Từ Vựng lưu trữ tất cả các từ bạn đã tra. Bạn có thể xem Hán Việt, câu ví dụ và quản lý từ vựng.",
      actionHint: "👉 Quản lý danh sách từ vựng và bấm Tiếp theo để sang trang Flashcard"
    },
    {
      page: '/vocabulary',
      badge: "CHUYỂN SANG FLASHCARD",
      selector: '[data-tour-nav="/flashcards"]',
      fallbackSelector: '.hanora-site-header',
      title: "Mở Trang Flashcard",
      speech: "👉 Tiếp theo hãy nhấp vào mục 'Flashcard' trên Menu để luyện tập ghi nhớ từ vựng!",
      actionHint: "👉 Bấm trực tiếp vào mục 'Flashcard' trên thanh Menu Header",
      autoNavigate: '/flashcards'
    },

    // --- TRANG 4: FLASHCARDS & LẶP LẠI NGẮT QUÃNG SRS ---
    {
      page: '/flashcards',
      badge: "TRANG 4/4: FLASHCARD",
      selector: 'main',
      fallbackSelector: '.hanora-site-header',
      title: "Luyện Tập Flashcards 3D & SRS",
      speech: "Trang Flashcards 3D sử dụng Thuật toán lặp lại ngắt quãng SRS tự động nhắc nhở ôn tập giúp nhớ 90%+ từ vựng!",
      actionHint: "👉 Luyện tập Flashcards và bấm Hoàn tất để nhận thưởng +50 XP"
    }
  ];

  // Auto-trigger for first-time registered users
  useEffect(() => {
    if (isAuthenticated && user) {
      const storageKey = `hanora_onboarding_completed_${user.id || user.email}`;
      const hasCompleted = localStorage.getItem(storageKey) === 'true';

      if ((user.needsOnboarding || user.isNewAccount) && !hasCompleted) {
        openTour();
      }
    }
  }, [isAuthenticated, user, openTour]);

  // Target element measurement & smooth scroll into view
  useEffect(() => {
    if (!isOpen) return;

    const stepData = steps[currentStep];
    if (!stepData) return;

    // Check if step requires page navigation
    if (stepData.page && location.pathname !== stepData.page && stepData.autoNavigate) {
      // Auto navigate if needed
      navigate(stepData.autoNavigate);
    }

    const updatePosition = () => {
      let el = document.querySelector(stepData.selector);
      if (!el && stepData.fallbackSelector) {
        el = document.querySelector(stepData.fallbackSelector);
      }

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      } else {
        setTargetRect(null);
      }
    };

    const timer = setTimeout(updatePosition, 350);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, currentStep, location.pathname, navigate]);

  // ACTION-DRIVEN CLICK LISTENER: Advance step when user clicks target element or menu!
  useEffect(() => {
    if (!isOpen) return;

    const stepData = steps[currentStep];
    if (!stepData) return;

    let el = document.querySelector(stepData.selector);
    if (!el && stepData.fallbackSelector) {
      el = document.querySelector(stepData.fallbackSelector);
    }

    if (!el) return;

    const handleTargetClick = () => {
      onboardingAudio.playChime();
      if (currentStep < steps.length - 1) {
        nextStep();
      } else {
        handleFinish();
      }
    };

    el.addEventListener('click', handleTargetClick, { capture: true });
    return () => {
      el.removeEventListener('click', handleTargetClick, { capture: true });
    };
  }, [isOpen, currentStep, nextStep]);

  if (!isOpen || !user) return null;

  const handleFinish = () => {
    onboardingAudio.playVictory();
    if (addXp) addXp(50);

    if (user) {
      const storageKey = `hanora_onboarding_completed_${user.id || user.email}`;
      localStorage.setItem(storageKey, 'true');
    }

    setShowRewardModal(true);
    setTimeout(() => {
      setShowRewardModal(false);
      closeTour();
      navigate('/dashboard');
    }, 2800);
  };

  const toggleSound = () => {
    onboardingAudio.isMuted = !isMuted;
    setIsMuted(!isMuted);
  };

  const currentData = steps[currentStep] || steps[0];

  // Calculate tooltip placement floating next to target element
  const getPillStyle = () => {
    if (!targetRect) {
      return { top: '85px', left: '50%', transform: 'translateX(-50%)' };
    }

    const spaceBelow = window.innerHeight - (targetRect.top + targetRect.height);
    const placeAbove = spaceBelow < 130 && targetRect.top > 130;

    const topPos = placeAbove
      ? Math.max(16, targetRect.top - 90)
      : Math.min(window.innerHeight - 100, targetRect.top + targetRect.height + 14);

    const leftPos = Math.max(16, Math.min(window.innerWidth - 380, targetRect.left));

    return {
      top: `${topPos}px`,
      left: `${leftPos}px`,
    };
  };

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-none select-none font-sans">
      
      {/* 1. Victory Reward Modal */}
      {showRewardModal && (
        <div className="fixed inset-0 z-[100005] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300 pointer-events-auto">
          <div className="bg-white border border-blue-100 shadow-2xl rounded-3xl p-8 max-w-sm w-full text-center space-y-4 relative overflow-hidden">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-orange-500/30 animate-bounce">
              <Trophy className="w-10 h-10 text-white drop-shadow-sm" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                THÀNH THẠO 4 TRANG HỌC TẬP
              </span>
              <h3 className="text-2xl font-black text-slate-850 tracking-tight">
                Xuất Sắc! 🎉
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                Bạn đã đi hết hành trình 4 trang: Tiến trình, Dịch thuật, Từ vựng & Flashcards!
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/80 p-3 rounded-2xl flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-black text-blue-700">+50 XP Thưởng Hoàn Thành</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Glowing Pulse Ring Outline directly on Target Button */}
      {targetRect && (
        <div
          className="fixed rounded-2xl border-2 border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.85)] pointer-events-none transition-all duration-300 ease-out animate-pulse z-[100000]"
          style={{
            top: `${Math.max(4, targetRect.top - 5)}px`,
            left: `${Math.max(4, targetRect.left - 5)}px`,
            width: `${targetRect.width + 10}px`,
            height: `${targetRect.height + 10}px`,
          }}
        />
      )}

      {/* 3. Sleek Floating Speech Pill Badge */}
      <div 
        className="fixed z-[100001] pointer-events-auto transition-all duration-300 ease-out"
        style={getPillStyle()}
      >
        <div className="bg-slate-900/95 text-white border border-slate-700/80 shadow-2xl rounded-2xl p-3.5 flex items-center gap-3 backdrop-blur-md font-sans max-w-md border-blue-500/30 animate-in zoom-in-95 duration-200">
          
          {/* Mascot Mini Avatar */}
          <div className="relative shrink-0">
            <img src={streakBadgeImg} alt="Mascot" className="w-10 h-10 object-cover rounded-xl shadow-xs animate-bounce" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900 animate-ping"></span>
          </div>

          {/* Speech Text & Step Counter */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 bg-blue-958/90 border border-blue-800/60 px-2 py-0.5 rounded-md">
                {currentData.badge}
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSound}
                  className="text-slate-400 hover:text-white p-0.5 rounded transition cursor-pointer"
                  title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-blue-400" />}
                </button>
                <button
                  onClick={handleFinish}
                  className="text-slate-400 hover:text-white p-0.5 rounded transition cursor-pointer"
                  title="Bỏ qua hướng dẫn"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <p className="text-xs font-black text-slate-100 leading-snug mt-1 flex items-start gap-1">
              <MousePointerClick className="w-3.5 h-3.5 text-yellow-400 animate-pulse shrink-0 mt-0.5" />
              <span>{currentData.speech}</span>
            </p>
          </div>

          {/* Step Navigation Controls */}
          <div className="flex items-center gap-1 shrink-0 pl-1">
            {currentStep > 0 && (
              <button
                onClick={() => {
                  onboardingAudio.playPop();
                  prevStep();
                }}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Quay lại"
              >
                Quay lại
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => {
                  onboardingAudio.playChime();
                  if (currentData.autoNavigate) {
                    navigate(currentData.autoNavigate);
                  }
                  nextStep();
                }}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs transition shadow-sm flex items-center gap-0.5 cursor-pointer"
              >
                <span>Tiếp</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                +50 XP 🚀
              </button>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};
