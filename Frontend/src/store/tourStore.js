import { create } from 'zustand';
import { tourSteps } from '../components/tour/tourSteps';
import { tourStorage } from '../utils/tourStorage';

export const useTourStore = create((set, get) => ({
  isTourActive: false,
  activeSteps: [], // Storing active steps for the current page
  currentStepId: '',
  currentStepIndex: 0,
  phase: 'dashboard',
  status: 'INTRO', // 'INTRO' | 'HIGHLIGHT' | 'WAITING_FOR_ACTION' | 'VALIDATING' | 'ACTION_SUCCESS' | 'COMPLETED'
  completed: tourStorage.isCompleted(),
  skipped: tourStorage.isSkipped(),
  isWaitingForElement: false,

  setWaitingForElement: (val) => set({ isWaitingForElement: val }),

  setStatus: (status) => set({ status }),

  startTour: (pathname = '/dashboard') => {
    let activePath = pathname;
    if (activePath === '/') activePath = '/dashboard';

    // Filter steps matching current path
    let filtered = tourSteps.filter(s => s.path === activePath);
    
    // If no steps found for current page, default to dashboard
    if (filtered.length === 0) {
      activePath = '/dashboard';
      filtered = tourSteps.filter(s => s.path === activePath);
    }

    set({
      isTourActive: true,
      activeSteps: filtered,
      currentStepId: filtered[0]?.id || '',
      currentStepIndex: 0,
      phase: activePath.replace('/', '') || 'dashboard',
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

  resetTour: (pathname = '/dashboard') => {
    tourStorage.clearAll();
    get().startTour(pathname);
  },

  // Called when user clicks "Đã hiểu" on INFORMATION step
  acknowledgeStep: () => {
    const { currentStepIndex, activeSteps, endTour, setStepByIndex } = get();
    const nextIdx = currentStepIndex + 1;
    if (nextIdx >= activeSteps.length) {
      endTour(true);
    } else {
      setStepByIndex(nextIdx);
    }
  },

  // Called when ACTION validation succeeds
  completeActionStep: (stepId) => {
    const { currentStepId, currentStepIndex, activeSteps, endTour, setStepByIndex } = get();
    
    // Only process if step matches active step
    if (stepId && stepId !== currentStepId) return;

    set({ status: 'ACTION_SUCCESS' });

    setTimeout(() => {
      const nextIdx = currentStepIndex + 1;
      if (nextIdx >= activeSteps.length) {
        endTour(true);
      } else {
        setStepByIndex(nextIdx);
      }
    }, 200);
  },

  setStepByIndex: (index) => {
    const { activeSteps } = get();
    if (index < 0 || index >= activeSteps.length) return;
    const step = activeSteps[index];
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
    const { activeSteps } = get();
    const idx = activeSteps.findIndex((s) => s.id === id);
    if (idx !== -1) {
      get().setStepByIndex(idx);
    }
  },

  prevStep: () => {
    const { currentStepIndex, setStepByIndex } = get();
    if (currentStepIndex > 0) {
      setStepByIndex(currentStepIndex - 1);
    }
  }
}));

