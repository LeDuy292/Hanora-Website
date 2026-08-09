import { useTourStore } from '../../store/tourStore';
import { tourSteps } from './tourSteps';
import { TourOverlay } from './TourOverlay';
import { TourTooltip } from './TourTooltip';
import { TourActionController } from './TourActionController';
import { TourCompletion } from './TourCompletion';

export const TourController = () => {
  const {
    isTourActive,
    currentStepIndex,
    status,
    endTour,
    prevStep,
    acknowledgeStep
  } = useTourStore();

  if (!isTourActive) return null;

  const currentStepData = tourSteps[currentStepIndex] || tourSteps[0];

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
            totalSteps={tourSteps.length}
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
