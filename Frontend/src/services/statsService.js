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
  trackTime: async (minutes) => {
    return apiRequest("/stats/track-time", {
      method: "POST",
      auth: true,
      body: { minutes }
    });
  },
  savePronunciationScore: async (score) => {
    return apiRequest("/stats/pronunciation-score", {
      method: "POST",
      auth: true,
      body: { score }
    });
  },
};
