import { apiRequest } from "./apiClient";

export const statsApi = {
  /**
   * Fetches the current user's gamification stats. This also advances the
   * daily-login streak server-side (idempotent within the same day), so it's
   * safe to call on both login and every app load.
   */
  me: async () => {
    return apiRequest("/stats/me", { auth: true });
  },
};
