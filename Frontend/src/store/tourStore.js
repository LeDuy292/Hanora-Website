import { create } from 'zustand';
import { tourSteps } from '../components/tour/tourSteps';
import { tourStorage } from '../utils/tourStorage';

export const useTourStore = create((set, get) => ({
  isTourActive: false,
  currentStepId: tourSteps[0].id,
  currentStepIndex: 0,
  phase: 'dashboard',
  status: 'INTRO', // 'INTRO' | 'HIGHLIGHT' | 'WAITING_FOR_ACTION' | 'VALIDATING' | 'ACTION_SUCCESS' | 'COMPLETED'
  completed: tourStorage.isCompleted(),
  skipped: tourStorage.isSkipped(),
  isWaitingForElement: false,

  setWaitingForElement: (val) => set({ isWaitingForElement: val }),

  setStatus: (status) => set({ status }),

  startTour: (initialStepId = null) => {
    let targetIndex = 0;
    if (initialStepId) {
      const idx = tourSteps.findIndex((s) => s.id === initialStepId);
      if (idx !== -1) targetIndex = idx;
    }

    const currentStep = tourSteps[targetIndex] || tourSteps[0];
    const initialPhase = currentStep.path === '/reader' ? 'reader' : currentStep.path === '/vocabulary' ? 'vocabulary' : currentStep.path === '/flashcards' ? 'flashcards' : 'dashboard';

    set({
      isTourActive: true,
      currentStepId: currentStep.id,
      currentStepIndex: targetIndex,
      phase: initialPhase,
      status: 'HIGHLIGHT',
      completed: false,
      skipped: false,
      isWaitingForElement: false
    });
  },

  endTour: (markCompleted = true, markSkipped = false) => {
    if (markCompleted) tourStorage.setCompleted(true);
    if (markSkipped) tourStorage.setSkipped(true);

    set({
      isTourActive: false,
      status: markCompleted ? 'COMPLETED' : 'INTRO',
      completed: markCompleted,
      skipped: markSkipped,
      isWaitingForElement: false
    });
  },

  resetTour: () => {
    tourStorage.clearAll();
    get().startTour(tourSteps[0].id);
  },

  // Called when user clicks "Đã hiểu" on INFORMATION step
  acknowledgeStep: () => {
    const { currentStepIndex, endTour, setStepByIndex } = get();
    const nextIdx = currentStepIndex + 1;
    if (nextIdx >= tourSteps.length) {
      endTour(true);
    } else {
      setStepByIndex(nextIdx);
    }
  },

  // Called when ACTION validation succeeds
  completeActionStep: (stepId) => {
    const { currentStepId, currentStepIndex, endTour, setStepByIndex } = get();
    
    // Only process if step matches active step
    if (stepId && stepId !== currentStepId) return;

    set({ status: 'ACTION_SUCCESS' });

    setTimeout(() => {
      const nextIdx = currentStepIndex + 1;
      if (nextIdx >= tourSteps.length) {
        endTour(true);
      } else {
        setStepByIndex(nextIdx);
      }
    }, 200);
  },

  setStepByIndex: (index) => {
    if (index < 0 || index >= tourSteps.length) return;
    const step = tourSteps[index];
    const newPhase = step.path === '/reader' ? 'reader' : step.path === '/vocabulary' ? 'vocabulary' : step.path === '/flashcards' ? 'flashcards' : 'dashboard';

    set({
      currentStepId: step.id,
      currentStepIndex: index,
      phase: newPhase,
      status: 'HIGHLIGHT',
      isWaitingForElement: false
    });
  },

  setStepById: (id) => {
    const idx = tourSteps.findIndex((s) => s.id === id);
    if (idx !== -1) {
      get().setStepByIndex(idx);
    }
  }
}));
