import { useTourStore } from '../store/tourStore';

export function useTourAction() {
  const currentStepId = useTourStore((s) => s.currentStepId);
  const isTourActive = useTourStore((s) => s.isTourActive);
  const completeActionStep = useTourStore((s) => s.completeActionStep);

  const completeStep = (stepId) => {
    if (!isTourActive) return;
    completeActionStep(stepId || currentStepId);
  };

  return {
    isTourActive,
    currentStepId,
    completeStep
  };
}
