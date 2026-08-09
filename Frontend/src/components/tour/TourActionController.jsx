import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTourStore } from '../../store/tourStore';
import { tourSteps } from './tourSteps';
import { onboardingAudio } from '../../utils/onboardingAudio';

export const TourActionController = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    isTourActive,
    currentStepId,
    currentStepIndex,
    completeActionStep,
    setStepByIndex
  } = useTourStore();

  const currentStep = tourSteps[currentStepIndex];

  // Route Synchronization across pages
  useEffect(() => {
    if (!isTourActive || !currentStep) return;

    if (currentStep.path && currentStep.path !== '*' && location.pathname !== currentStep.path) {
      if (currentStep.targetRoute) {
        navigate(currentStep.targetRoute);
      }
    }
  }, [isTourActive, currentStepIndex, currentStep, location.pathname, navigate]);

  // Event Action Validation Listener
  useEffect(() => {
    if (!isTourActive || !currentStep) return;

    // Skip information steps (handled by "Đã hiểu" button)
    if (currentStep.type === 'information') return;

    let targetEl = document.querySelector(currentStep.target);
    if (!targetEl && currentStep.fallbackTarget) {
      targetEl = document.querySelector(currentStep.fallbackTarget);
    }

    if (!targetEl) return;

    const handleUserAction = (e) => {
      onboardingAudio.playChime();

      // Check if target route navigation is required
      if (currentStep.targetRoute && location.pathname !== currentStep.targetRoute) {
        navigate(currentStep.targetRoute);
      }

      completeActionStep(currentStep.id);
    };

    const eventName = currentStep.action === 'input' ? 'input' : 'click';
    targetEl.addEventListener(eventName, handleUserAction, { capture: true });

    return () => {
      targetEl.removeEventListener(eventName, handleUserAction, { capture: true });
    };
  }, [isTourActive, currentStepIndex, currentStep, location.pathname, navigate, completeActionStep]);

  return null;
};
