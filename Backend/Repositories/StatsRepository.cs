using BusinessObjects.Models;
using DataAccessObjects;
using Microsoft.EntityFrameworkCore;

namespace Repositories
{
    public interface IStatsRepository
    {
        /// <summary>Returns the user's stats row, creating a zeroed one if it doesn't exist yet.</summary>
        Task<UserStat> GetOrCreateStatsAsync(long userId);
        Task SaveAsync(UserStat stats);
        /// <summary>Daily learning-goal minutes for the user (defaults to 20 when unset).</summary>
        Task<int> GetDailyGoalMinutesAsync(long userId);
        /// <summary>Study minutes logged for the user on the given activity date.</summary>
        Task<int> GetMinutesOnDateAsync(long userId, DateOnly date);
    }

    public class StatsRepository : IStatsRepository
    {
        private readonly AppDbContext _db;

        public StatsRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task<UserStat> GetOrCreateStatsAsync(long userId)
        {
            var stats = await _db.UserStats.FirstOrDefaultAsync(s => s.UserId == userId);
            if (stats != null) return stats;

            stats = new UserStat
            {
                UserId = userId,
                TotalXp = 0,
                TotalWordsSaved = 0,
                TotalWordsMastered = 0,
                TotalDocumentsRead = 0,
                TotalStudySessions = 0,
                TotalFlashcardsDone = 0,
                TotalQuizzesDone = 0,
                TotalStudyMinutes = 0,
                CurrentStreakDays = 0,
                LongestStreakDays = 0,
                XpToday = 0,
                XpThisWeek = 0,
                XpThisMonth = 0,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.UserStats.Add(stats);
            await _db.SaveChangesAsync();
            return stats;
        }

        public async Task SaveAsync(UserStat stats)
        {
            _db.UserStats.Update(stats);
            await _db.SaveChangesAsync();
        }

        public async Task<int> GetDailyGoalMinutesAsync(long userId)
        {
            var goal = await _db.UserLearningGoals
                .Where(g => g.UserId == userId)
                .Select(g => (int?)g.DailyMinutesGoal)
                .FirstOrDefaultAsync();
            return goal ?? 20;
        }

        public async Task<int> GetMinutesOnDateAsync(long userId, DateOnly date)
        {
            var minutes = await _db.LearningProgresses
                .Where(p => p.UserId == userId && p.ActivityDate == date)
                .Select(p => p.StudyMinutes ?? 0)
                .FirstOrDefaultAsync();
            return minutes;
        }
    }
}
