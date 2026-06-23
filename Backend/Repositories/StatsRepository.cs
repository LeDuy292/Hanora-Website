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
        Task SetDailyGoalMinutesAsync(long userId, int minutes);
        Task<int> GetTotalXpAsync(long userId);
        Task IncrementStudyMinutesAsync(long userId, DateOnly date, int minutes);
        Task<int> GetMinutesInRangeAsync(long userId, DateOnly from, DateOnly to);
        Task UpdatePronunciationScoreAsync(long userId, double score);
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

        public async Task SetDailyGoalMinutesAsync(long userId, int minutes)
        {
            var goal = await _db.UserLearningGoals.FirstOrDefaultAsync(g => g.UserId == userId);
            if (goal == null)
            {
                goal = new UserLearningGoal
                {
                    UserId = userId,
                    DailyMinutesGoal = minutes,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.UserLearningGoals.Add(goal);
            }
            else
            {
                goal.DailyMinutesGoal = minutes;
                goal.UpdatedAt = DateTime.UtcNow;
                _db.UserLearningGoals.Update(goal);
            }
            await _db.SaveChangesAsync();
        }

        public async Task<int> GetTotalXpAsync(long userId)
        {
            return await _db.QuizSessions
                .Where(q => q.UserId == userId && q.Status == "Completed")
                .SumAsync(q => q.Xp ?? 0);
        }

        public async Task IncrementStudyMinutesAsync(long userId, DateOnly date, int minutes)
        {
            var progress = await _db.LearningProgresses
                .FirstOrDefaultAsync(p => p.UserId == userId && p.ActivityDate == date);

            if (progress == null)
            {
                progress = new LearningProgress
                {
                    UserId = userId,
                    ActivityDate = date,
                    StudyMinutes = minutes,
                    DocumentsRead = 0,
                    PagesRead = 0,
                    WordsClicked = 0,
                    NewWordsSaved = 0,
                    TotalWordsSaved = 0,
                    WordsMastered = 0,
                    StudySessionsDone = 0,
                    FlashcardsReviewed = 0,
                    FlashcardsKnow = 0,
                    LearnRoundsDone = 0,
                    LearnCorrect = 0,
                    MatchGamesDone = 0,
                    QuizzesCompleted = 0,
                    QuizTotalQuestions = 0,
                    QuizCorrectAnswers = 0,
                    XpEarned = 0
                };
                _db.LearningProgresses.Add(progress);
            }
            else
            {
                progress.StudyMinutes = (progress.StudyMinutes ?? 0) + minutes;
                _db.LearningProgresses.Update(progress);
            }

            // Also sync the total study minutes in UserStat
            var stats = await GetOrCreateStatsAsync(userId);
            if (stats != null)
            {
                stats.TotalStudyMinutes = (stats.TotalStudyMinutes ?? 0) + minutes;
                stats.UpdatedAt = DateTime.UtcNow;
                _db.UserStats.Update(stats);
            }

            await _db.SaveChangesAsync();
        }

        public async Task<int> GetMinutesInRangeAsync(long userId, DateOnly from, DateOnly to)
        {
            return await _db.LearningProgresses
                .Where(p => p.UserId == userId && p.ActivityDate >= from && p.ActivityDate <= to)
                .SumAsync(p => p.StudyMinutes ?? 0);
        }

        public async Task UpdatePronunciationScoreAsync(long userId, double score)
        {
            var stats = await GetOrCreateStatsAsync(userId);
            double currentScore = (double)(stats.AveragePronunciationScore ?? 0.00m);
            int currentAttempts = stats.TotalPronunciationAttempts ?? 0;

            double newAverage = (currentScore * currentAttempts + score) / (currentAttempts + 1);
            stats.AveragePronunciationScore = (decimal)Math.Round(newAverage, 2);
            stats.TotalPronunciationAttempts = currentAttempts + 1;
            stats.UpdatedAt = DateTime.UtcNow;

            _db.UserStats.Update(stats);
            await _db.SaveChangesAsync();
        }
    }
}
