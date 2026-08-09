import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTourStore } from '../../store/tourStore';
import { tourSteps } from './tourStepsConfig';
import { TourOverlay } from './TourOverlay';
import { TourTooltip } from './TourTooltip';
import { onboardingAudio } from '../../utils/onboardingAudio';
import { useAuthStore } from '../../store/authStore';
import { Trophy, Sparkles } from 'lucide-react';

export const InteractiveTourEngine = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addXp } = useAuthStore();

  const {
    isTourActive,
    currentStepIndex,
    endTour,
    nextStep,
    prevStep
  } = useTourStore();

  const [showCelebration, setShowCelebration] = useState(false);

  // If user starts tour on any page other than /dashboard, redirect them first by pointing to "Tiến trình" nav link
  const isOffDashboardOnStart = currentStepIndex === 0 && location.pathname !== '/dashboard';

  const redirectStep = {
    id: "step-nav-dashboard",
    page: location.pathname,
    target: '[data-tour-nav="/dashboard"]',
    fallbackTarget: '.hanora-site-header',
    title: "Về Trang Tiến Trình",
    description: "Hãy nhấp vào mục 'Tiến trình' trên thanh Menu Header để quay về Bảng Điều Khiển bắt đầu hướng dẫn nhé!",
    action: "navigation",
    targetRoute: "/dashboard",
    actionHint: "👉 Nhấp vào mục 'Tiến trình' trên thanh Menu Header"
  };

  const activeStepsList = isOffDashboardOnStart ? [redirectStep, ...tourSteps] : tourSteps;
  const currentStepData = activeStepsList[currentStepIndex] || activeStepsList[0];

  // Route Synchronization
  useEffect(() => {
    if (!isTourActive || !currentStepData) return;

    if (currentStepData.page && location.pathname !== currentStepData.page) {
      if (currentStepData.autoNavigate) {
        navigate(currentStepData.autoNavigate);
      }
    }
  }, [isTourActive, currentStepIndex, currentStepData, location.pathname, navigate]);

  // ACTION LISTENER ENGINE (click, input, navigation, submit)
  useEffect(() => {
    if (!isTourActive || !currentStepData) return;

    let targetEl = document.querySelector(currentStepData.target);
    if (!targetEl && currentStepData.fallbackTarget) {
      targetEl = document.querySelector(currentStepData.fallbackTarget);
    }

    if (!targetEl) return;

    const actionType = currentStepData.action || 'click';

    const handleUserAction = (e) => {
      // Validate input action if required
      if (actionType === 'input') {
        const val = e.target.value || '';
        if (currentStepData.validateInput && !currentStepData.validateInput(val)) {
          return;
        }
      }

      onboardingAudio.playChime();

      // Check if next step navigation is needed
      if (currentStepData.targetRoute && location.pathname !== currentStepData.targetRoute) {
        navigate(currentStepData.targetRoute);
      }

      // Advance step
      if (currentStepIndex < activeStepsList.length - 1) {
        nextStep(activeStepsList.length);
      } else {
        handleTourCompletion();
      }
    };

    // Attach event listeners based on action type
    const eventName = actionType === 'input' ? 'input' : 'click';
    targetEl.addEventListener(eventName, handleUserAction, { capture: true });

    return () => {
      targetEl.removeEventListener(eventName, handleUserAction, { capture: true });
    };
  }, [isTourActive, currentStepIndex, currentStepData, location.pathname, navigate, nextStep, activeStepsList.length]);

  const handleTourCompletion = () => {
    onboardingAudio.playVictory();
    if (addXp) addXp(50);
    setShowCelebration(true);

    setTimeout(() => {
      setShowCelebration(false);
      endTour(true);
      navigate('/dashboard');
    }, 2800);
  };

  if (!isTourActive || !currentStepData) return null;

  return (
    <>
      {/* 1. Victory Fanfare Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-[100005] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300 pointer-events-auto">
          <div className="bg-white border border-blue-100 shadow-2xl rounded-3xl p-8 max-w-sm w-full text-center space-y-4 relative overflow-hidden font-sans">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-orange-500/30 animate-bounce">
              <Trophy className="w-10 h-10 text-white drop-shadow-sm" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                HOÀN THÀNH PRODUCT TOUR
              </span>
              <h3 className="text-2xl font-black text-slate-850 tracking-tight">
                Bạn đã hoàn thành hướng dẫn! 🎉
              </h3>
              <p className="text-xs text-slate-500 font-bold">
                Tuyệt vời! Bạn đã thành thạo thao tác sử dụng website Hanora.
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/80 p-3 rounded-2xl flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-black text-blue-700">+50 XP Thưởng Hoàn Thành</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Tour Overlay & Highlight Cutout Spotlight */}
      <TourOverlay currentStepData={currentStepData} />

      {/* 3. Smart Floating Action Tooltip */}
      <TourTooltip
        currentStepData={currentStepData}
        totalSteps={activeStepsList.length}
        onSkip={() => endTour(true)}
        onPrev={prevStep}
      />
    </>
  );
};
