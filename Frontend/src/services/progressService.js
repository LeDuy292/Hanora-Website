import { apiRequest } from "./apiClient";

export const progressApi = {
  /**
   * Fetches the aggregated Learning Progress Dashboard for the current user:
   * streak, XP/level, daily goal, SRS due count, vocabulary notebook, growth
   * chart, recent documents, weekly stats, and achievements. All values are
   * computed live on the backend.
   */
  getDashboard: async () => {
    return apiRequest("/progress/dashboard", { auth: true });
  },
  setGoal: async (goalMinutes) => {
    return apiRequest("/progress/goal", {
      method: "PUT",
      auth: true,
      body: { goalMinutes }
    });
  },
};
