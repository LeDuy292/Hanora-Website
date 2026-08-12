import { useTourStore } from '../../store/tourStore';
import { TourOverlay } from './TourOverlay';
import { TourTooltip } from './TourTooltip';
import { TourActionController } from './TourActionController';
import { TourCompletion } from './TourCompletion';

export const TourController = () => {
  const {
    isTourActive,
    activeSteps,
    currentStepIndex,
    status,
    endTour,
    prevStep,
    acknowledgeStep
  } = useTourStore();

  if (!isTourActive || !activeSteps || activeSteps.length === 0) return null;

  const currentStepData = activeSteps[currentStepIndex] || activeSteps[0];

  return (
    <>
      {/* 1. Action Controller Engine */}
      <TourActionController />

      {/* 2. Victory Completion Modal */}
      {status === 'COMPLETED' ? (
        <TourCompletion />
      ) : (
        <>
          {/* 3. Dark Backdrop & Cutout Spotlight Overlay */}
          <TourOverlay currentStepData={currentStepData} />

          {/* 4. Smart Tooltip Bubble */}
          <TourTooltip
            currentStepData={currentStepData}
            totalSteps={activeSteps.length}
            onSkip={() => endTour(false, true)}
            onPrev={prevStep}
            onAcknowledge={acknowledgeStep}
          />
        </>
      )}
    </>
  );
};

export { TourController as TourProvider };

