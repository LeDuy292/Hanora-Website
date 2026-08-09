const TOUR_COMPLETED_KEY = 'userTourCompleted';
const TOUR_SKIPPED_KEY = 'userTourSkipped';

export const tourStorage = {
  isCompleted: () => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(TOUR_COMPLETED_KEY) === 'true';
  },

  setCompleted: (value = true) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(TOUR_COMPLETED_KEY, String(value));
  },

  isSkipped: () => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(TOUR_SKIPPED_KEY) === 'true';
  },

  setSkipped: (value = true) => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(TOUR_SKIPPED_KEY, String(value));
  },

  clearAll: () => {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    localStorage.removeItem(TOUR_SKIPPED_KEY);
  }
};
