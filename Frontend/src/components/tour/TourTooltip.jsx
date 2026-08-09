import { useEffect, useState, useRef } from 'react';
import { useTourStore } from '../../store/tourStore';
import { onboardingAudio } from '../../utils/onboardingAudio';
import { 
  X, 
  MousePointerClick, 
  ChevronLeft,
  Volume2,
  VolumeX,
  CheckCircle,
  SkipForward
} from 'lucide-react';
import streakBadgeImg from '../../assets/StreakImage.png';

export const TourTooltip = ({ currentStepData, totalSteps, onSkip, onPrev, onAcknowledge }) => {
  const { currentStepIndex } = useTourStore();
  const [isMuted, setIsMuted] = useState(false);
  const [positionStyle, setPositionStyle] = useState({});
  const prevStyleRef = useRef(null);

  useEffect(() => {
    if (!currentStepData) return;

    const updateTooltipPosition = () => {
      let el = document.querySelector(currentStepData.target);
      if (!el && currentStepData.fallbackTarget) {
        el = document.querySelector(currentStepData.fallbackTarget);
      }

      if (!el) {
        const fallbackStyle = { top: '80px', left: '50%', transform: 'translateX(-50%)' };
        if (prevStyleRef.current?.top !== fallbackStyle.top) {
          prevStyleRef.current = fallbackStyle;
          setPositionStyle(fallbackStyle);
        }
        return;
      }

      const rect = el.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Smart Placement logic: Below or Above target with strict viewport bounds
      const ESTIMATED_TOOLTIP_HEIGHT = 190;
      const spaceBelow = viewportHeight - (rect.top + rect.height);
      const placeAbove = spaceBelow < ESTIMATED_TOOLTIP_HEIGHT + 20 && rect.top > ESTIMATED_TOOLTIP_HEIGHT + 20;

      let topPos = placeAbove
        ? rect.top - ESTIMATED_TOOLTIP_HEIGHT - 12
        : rect.top + rect.height + 14;

      // Strict Viewport Clamping: Never allow topPos to push bottom of tooltip off screen!
      topPos = Math.max(16, Math.min(viewportHeight - ESTIMATED_TOOLTIP_HEIGHT - 20, topPos));

      let leftPos = Math.max(16, Math.min(viewportWidth - 380, rect.left));
      if (viewportWidth < 480) {
        leftPos = Math.max(12, (viewportWidth - 340) / 2);
      }

      const nextStyle = {
        top: `${topPos}px`,
        left: `${leftPos}px`,
      };

      const prev = prevStyleRef.current;
      if (!prev || prev.top !== nextStyle.top || prev.left !== nextStyle.left) {
        prevStyleRef.current = nextStyle;
        setPositionStyle(nextStyle);
      }
    };

    updateTooltipPosition();
    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition);

    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition);
    };
  }, [currentStepData]);

  const toggleSound = () => {
    onboardingAudio.isMuted = !isMuted;
    setIsMuted(!isMuted);
  };

  const isInformationStep = currentStepData.type === 'information';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={currentStepData.title}
      className="fixed z-[100000] pointer-events-auto transition-all duration-300 ease-out"
      style={positionStyle}
    >
      <div className="bg-slate-900/95 text-white border border-slate-700/80 shadow-2xl rounded-2xl p-3.5 flex flex-col gap-2.5 backdrop-blur-md font-sans max-w-sm border-blue-500/30 animate-in zoom-in-95 duration-200">
        
        {/* Header Row: Step counter & Skip Button */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded-md">
            BƯỚC {currentStepIndex + 1} / {totalSteps}
          </span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
              title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-blue-400" />}
            </button>

            {/* Clear Text "Bỏ qua" Button */}
            <button
              onClick={onSkip}
              className="px-2.5 py-0.5 bg-slate-800 hover:bg-red-600/20 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/40 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
              title="Bỏ qua toàn bộ hướng dẫn"
            >
              <SkipForward className="w-3 h-3" />
              <span>Bỏ qua</span>
            </button>
          </div>
        </div>

        {/* Content Row: Avatar + Title & Description */}
        <div className="flex items-start gap-3">
          {/* Mascot Mini Avatar */}
          <div className="relative shrink-0 w-10 h-10 min-w-[40px] max-w-[40px] min-h-[40px] max-h-[40px] overflow-hidden rounded-xl">
            <img 
              src={streakBadgeImg} 
              alt="Mascot" 
              className="w-10 h-10 min-w-[40px] max-w-[40px] min-h-[40px] max-h-[40px] object-cover rounded-xl shadow-xs shrink-0 animate-bounce" 
              style={{ width: '40px', height: '40px', maxWidth: '40px', maxHeight: '40px' }}
            />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900 animate-ping"></span>
          </div>

          {/* Speech Text */}
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black text-white">
              {currentStepData.title}
            </h4>
            <p className="text-[11px] font-semibold text-slate-200 leading-snug mt-0.5">
              "{currentStepData.description}"
            </p>

            {!isInformationStep && currentStepData.actionHint && (
              <div className="mt-2 text-[10px] font-black text-amber-300 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                <MousePointerClick className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                <span>{currentStepData.actionHint}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Control Actions */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
          {currentStepIndex > 0 ? (
            <button
              onClick={onPrev}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Quay lại</span>
            </button>
          ) : <div />}

          {isInformationStep ? (
            <button
              onClick={() => {
                onboardingAudio.playChime();
                if (onAcknowledge) onAcknowledge();
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-extrabold text-xs transition shadow-sm flex items-center gap-1 cursor-pointer ml-auto"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Đã hiểu</span>
            </button>
          ) : (
            <button
              onClick={onSkip}
              className="text-[10px] text-slate-400 hover:text-slate-200 font-bold transition underline cursor-pointer ml-auto"
            >
              Bỏ qua hướng dẫn
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
