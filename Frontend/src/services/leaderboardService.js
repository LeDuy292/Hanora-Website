import { apiRequest } from "./apiClient";

export const leaderboardApi = {
  getLeaderboard: async (period = 'global', criteria = 'default') => {
    return apiRequest(`/leaderboard?period=${period}&criteria=${criteria}`, { auth: true });
  }
};
