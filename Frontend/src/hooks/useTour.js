import { useTourStore } from '../store/tourStore';
import { tourSteps } from '../components/tour/tourSteps';

export function useTour() {
  const isTourActive = useTourStore((s) => s.isTourActive);
  const currentStepId = useTourStore((s) => s.currentStepId);
  const currentStepIndex = useTourStore((s) => s.currentStepIndex);
  const phase = useTourStore((s) => s.phase);
  const status = useTourStore((s) => s.status);
  const completed = useTourStore((s) => s.completed);
  const skipped = useTourStore((s) => s.skipped);

  const startTour = useTourStore((s) => s.startTour);
  const endTour = useTourStore((s) => s.endTour);
  const resetTour = useTourStore((s) => s.resetTour);
  const acknowledgeStep = useTourStore((s) => s.acknowledgeStep);

  const currentStep = tourSteps[currentStepIndex] || tourSteps[0];

  return {
    isTourActive,
    currentStepId,
    currentStepIndex,
    currentStep,
    phase,
    status,
    completed,
    skipped,
    startTour,
    endTour,
    resetTour,
    acknowledgeStep
  };
}
