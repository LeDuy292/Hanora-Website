import { create } from 'zustand';

export const useOnboardingStore = create((set) => ({
  isOpen: false,
  currentStep: 0,

  openTour: () => set({ isOpen: true, currentStep: 0 }),
  closeTour: () => set({ isOpen: false }),
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: Math.min(3, state.currentStep + 1) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) }))
}));
