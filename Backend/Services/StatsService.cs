using BusinessObjects.Models;
using Repositories;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Services;

public interface IStatsService
{
    /// <summary>
    /// Records a login "touch" for today and returns the user's current stats.
    /// Call this on login and on every app load — the streak only advances once
    /// per calendar day, so repeated calls in the same day are idempotent.
    /// </summary>
    Task<UserStatsDto> TouchAndGetAsync(long userId);

    Task<UserStatsDto> GetAsync(long userId);
    Task TrackTimeAsync(long userId, int minutes);
    Task TrackPronunciationScoreAsync(long userId, double score);
    Task AwardXpAsync(long userId, int xpAmount, string reason);
    Task TrackQuizCompletionAsync(long userId, int totalQuestions, int correctAnswers);
    Task TrackFlashcardSessionAsync(long userId, int cardsStudied, int knowCount);
}

/// <summary>Shape the frontend consumes for the header/dashboard gamification.</summary>
public record UserStatsDto
{
    public int Streak { get; init; }
    public int LongestStreak { get; init; }
    public int Xp { get; init; }
    public int XpToday { get; init; }
    public int XpThisWeek { get; init; }
    public string Level { get; init; } = "Level 1";
    public int TodayMinutes { get; init; }
    public int TargetDailyMinutes { get; init; }
    public int TotalWordsSaved { get; init; }
    public int TotalWordsMastered { get; init; }
    public int TotalDocumentsRead { get; init; }
    public int TotalQuizzesDone { get; init; }
    public double AveragePronunciationScore { get; init; }
    public int TotalPronunciationAttempts { get; init; }
    public string? LastActiveDate { get; init; }
}

public class StatsService : IStatsService
{
    private readonly IStatsRepository _statsRepo;
    private readonly DataAccessObjects.AppDbContext _db;

    // The streak rolls over at local midnight in Vietnam (UTC+7), so a login at
    // 00:01 ICT counts as a new day even though it's still "yesterday" in UTC.
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    public StatsService(IStatsRepository statsRepo, DataAccessObjects.AppDbContext db)
    {
        _statsRepo = statsRepo;
        _db = db;
    }

    private static DateOnly TodayVn() =>
        DateOnly.FromDateTime(DateTime.UtcNow + VietnamOffset);

    public async Task<UserStatsDto> TouchAndGetAsync(long userId)
    {
        var stats = await _statsRepo.GetOrCreateStatsAsync(userId);
        var today = TodayVn();
        var last = stats.LastActiveDate;

        // Daily-login streak: +1 the first time we see the user on a new day.
        // Same day → unchanged. A gap of >1 day → streak restarts at 1.
        if (last == null)
        {
            stats.CurrentStreakDays = 1;
        }
        else if (last.Value == today)
        {
            // Already counted today; leave the streak as-is.
        }
        else if (last.Value == today.AddDays(-1))
        {
            stats.CurrentStreakDays = (stats.CurrentStreakDays ?? 0) + 1;
        }
        else
        {
            // Missed at least one full day → chain broken, count today as day 1.
            stats.CurrentStreakDays = 1;
        }

        if ((stats.CurrentStreakDays ?? 0) > (stats.LongestStreakDays ?? 0))
            stats.LongestStreakDays = stats.CurrentStreakDays;

        bool changed = last != today;
        if (changed)
        {
            stats.LastActiveDate = today;
            stats.UpdatedAt = DateTime.UtcNow;
            await _statsRepo.SaveAsync(stats);
            
            // Check streak achievements
            await CheckAchievementsAsync(userId, stats);
        }

        return await BuildDtoAsync(userId, stats, today);
    }

    public async Task<UserStatsDto> GetAsync(long userId)
    {
        var stats = await _statsRepo.GetOrCreateStatsAsync(userId);
        return await BuildDtoAsync(userId, stats, TodayVn());
    }

    private async Task<UserStatsDto> BuildDtoAsync(long userId, UserStat stats, DateOnly today)
    {
        int goal = await _statsRepo.GetDailyGoalMinutesAsync(userId);
        int todayMinutes = await _statsRepo.GetMinutesOnDateAsync(userId, today);
        int totalXp = stats.TotalXp ?? 0;

        return new UserStatsDto
        {
            Streak = stats.CurrentStreakDays ?? 0,
            LongestStreak = stats.LongestStreakDays ?? 0,
            Xp = totalXp,
            XpToday = stats.XpToday ?? 0,
            XpThisWeek = stats.XpThisWeek ?? 0,
            Level = LevelForXp(totalXp),
            TodayMinutes = todayMinutes,
            TargetDailyMinutes = goal,
            TotalWordsSaved = stats.TotalWordsSaved ?? 0,
            TotalWordsMastered = stats.TotalWordsMastered ?? 0,
            TotalDocumentsRead = stats.TotalDocumentsRead ?? 0,
            TotalQuizzesDone = stats.TotalQuizzesDone ?? 0,
            AveragePronunciationScore = (double)(stats.AveragePronunciationScore ?? 0.00m),
            TotalPronunciationAttempts = stats.TotalPronunciationAttempts ?? 0,
            LastActiveDate = stats.LastActiveDate?.ToString("yyyy-MM-dd"),
        };
    }

    private static string LevelForXp(int xp)
    {
        return $"Level {CalculateLevel(xp)}";
    }

    public static int CalculateLevel(int xp)
    {
        if (xp >= 10000) return 10;
        if (xp >= 7000) return 9;
        if (xp >= 5000) return 8;
        if (xp >= 3600) return 7;
        if (xp >= 2600) return 6;
        if (xp >= 1800) return 5;
        if (xp >= 1200) return 4;
        if (xp >= 700) return 3;
        if (xp >= 300) return 2;
        return 1;
    }

    public static int GetLevelThreshold(int level)
    {
        return level switch
        {
            1 => 0,
            2 => 300,
            3 => 700,
            4 => 1200,
            5 => 1800,
            6 => 2600,
            7 => 3600,
            8 => 5000,
            9 => 7000,
            10 => 10000,
            _ => 10000 + (level - 10) * 5000
        };
    }

    public async Task TrackTimeAsync(long userId, int minutes)
    {
        var today = TodayVn();
        int oldMinutes = await _statsRepo.GetMinutesOnDateAsync(userId, today);
        int newMinutes = oldMinutes + minutes;

        await _statsRepo.IncrementStudyMinutesAsync(userId, today, minutes);

        // Award XP for daily study minutes thresholds
        if (oldMinutes < 5 && newMinutes >= 5)
        {
            await AwardXpAsync(userId, 10, "Đọc dịch đủ 5 phút");
        }
        if (oldMinutes < 15 && newMinutes >= 15)
        {
            await AwardXpAsync(userId, 20, "Đọc dịch đủ 15 phút");
        }
    }

    public async Task TrackPronunciationScoreAsync(long userId, double score)
    {
        await _statsRepo.UpdatePronunciationScoreAsync(userId, score);
    }

    public async Task AwardXpAsync(long userId, int xpAmount, string reason)
    {
        if (xpAmount <= 0) return;

        var stats = await _statsRepo.GetOrCreateStatsAsync(userId);
        stats.TotalXp = (stats.TotalXp ?? 0) + xpAmount;
        stats.XpToday = (stats.XpToday ?? 0) + xpAmount;
        stats.XpThisWeek = (stats.XpThisWeek ?? 0) + xpAmount;
        stats.XpThisMonth = (stats.XpThisMonth ?? 0) + xpAmount;
        stats.UpdatedAt = DateTime.UtcNow;

        await _statsRepo.SaveAsync(stats);

        var today = TodayVn();
        var progress = await _db.LearningProgresses
            .FirstOrDefaultAsync(p => p.UserId == userId && p.ActivityDate == today);

        if (progress == null)
        {
            progress = new LearningProgress
            {
                UserId = userId,
                ActivityDate = today,
                XpEarned = xpAmount,
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
                StudyMinutes = 0
            };
            _db.LearningProgresses.Add(progress);
        }
        else
        {
            progress.XpEarned = (progress.XpEarned ?? 0) + xpAmount;
            _db.LearningProgresses.Update(progress);
        }
        await _db.SaveChangesAsync();

        await CheckAchievementsAsync(userId, stats);

        var notification = new UserNotification
        {
            UserId = userId,
            Title = "Nhận được XP!",
            Message = $"Bạn được cộng +{xpAmount} XP từ hoạt động: {reason}.",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _db.UserNotifications.Add(notification);
        await _db.SaveChangesAsync();
    }

    private async Task CheckAchievementsAsync(long userId, UserStat stats)
    {
        int streak = stats.CurrentStreakDays ?? 0;
        int savedCount = stats.TotalWordsSaved ?? 0;
        int masteredCount = stats.TotalWordsMastered ?? 0;
        int docCount = stats.TotalDocumentsRead ?? 0;
        int quizCount = stats.TotalQuizzesDone ?? 0;
        int flipCount = stats.TotalFlashcardsDone ?? 0;

        bool perfectQuiz = await _db.QuizSessions
            .AnyAsync(q => q.UserId == userId && q.Status == "Completed" && q.AccuracyPercent >= 100m);

        var achievements = await _db.Achievements.ToListAsync();
        var unlockedIds = await _db.UserAchievements
            .Where(ua => ua.UserId == userId)
            .Select(ua => ua.AchievementId)
            .ToListAsync();

        foreach (var a in achievements)
        {
            if (unlockedIds.Contains(a.Id)) continue;

            bool isUnlocked = a.Code switch
            {
                "streak_3" => streak >= 3,
                "streak_7" => streak >= 7,
                "streak_30" => streak >= 30,
                "vocab_10" => savedCount >= 10,
                "vocab_50" => savedCount >= 50,
                "vocab_100" => savedCount >= 100,
                "vocab_500" => savedCount >= 500,
                "mastered_10" => masteredCount >= 10,
                "mastered_100" => masteredCount >= 100,
                "first_doc" => docCount >= 1,
                "first_quiz" => quizCount >= 1,
                "perfect_quiz" => perfectQuiz,
                "flashcard_100" => flipCount >= 100,
                _ => false
            };

            if (isUnlocked)
            {
                var ua = new UserAchievement
                {
                    UserId = userId,
                    AchievementId = a.Id,
                    EarnedAt = DateTime.UtcNow
                };
                _db.UserAchievements.Add(ua);
                await _db.SaveChangesAsync();

                int reward = a.XpReward ?? 0;
                if (reward > 0)
                {
                    stats.TotalXp = (stats.TotalXp ?? 0) + reward;
                    stats.XpToday = (stats.XpToday ?? 0) + reward;
                    stats.XpThisWeek = (stats.XpThisWeek ?? 0) + reward;
                    stats.XpThisMonth = (stats.XpThisMonth ?? 0) + reward;
                    await _statsRepo.SaveAsync(stats);

                    var achievementNotification = new UserNotification
                    {
                        UserId = userId,
                        Title = $"Mở khóa huy hiệu: {a.Name}!",
                        Message = $"Chúc mừng bạn đã mở khóa huy hiệu '{a.Name}' và nhận được +{reward} XP!",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    _db.UserNotifications.Add(achievementNotification);
                    await _db.SaveChangesAsync();
                }
            }
        }
    }

    public async Task TrackQuizCompletionAsync(long userId, int totalQuestions, int correctAnswers)
    {
        var stats = await _statsRepo.GetOrCreateStatsAsync(userId);
        stats.TotalQuizzesDone = (stats.TotalQuizzesDone ?? 0) + 1;
        stats.UpdatedAt = DateTime.UtcNow;
        await _statsRepo.SaveAsync(stats);

        var today = TodayVn();
        var progress = await _db.LearningProgresses
            .FirstOrDefaultAsync(p => p.UserId == userId && p.ActivityDate == today);

        if (progress == null)
        {
            progress = new LearningProgress
            {
                UserId = userId,
                ActivityDate = today,
                QuizzesCompleted = 1,
                QuizTotalQuestions = totalQuestions,
                QuizCorrectAnswers = correctAnswers,
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
                StudyMinutes = 0,
                XpEarned = 0
            };
            _db.LearningProgresses.Add(progress);
        }
        else
        {
            progress.QuizzesCompleted = (progress.QuizzesCompleted ?? 0) + 1;
            progress.QuizTotalQuestions = (progress.QuizTotalQuestions ?? 0) + totalQuestions;
            progress.QuizCorrectAnswers = (progress.QuizCorrectAnswers ?? 0) + correctAnswers;
            _db.LearningProgresses.Update(progress);
        }
        await _db.SaveChangesAsync();

        await CheckAchievementsAsync(userId, stats);
    }

    public async Task TrackFlashcardSessionAsync(long userId, int cardsStudied, int knowCount)
    {
        var stats = await _statsRepo.GetOrCreateStatsAsync(userId);
        stats.TotalFlashcardsDone = (stats.TotalFlashcardsDone ?? 0) + cardsStudied;
        stats.UpdatedAt = DateTime.UtcNow;
        await _statsRepo.SaveAsync(stats);

        var today = TodayVn();
        var progress = await _db.LearningProgresses
            .FirstOrDefaultAsync(p => p.UserId == userId && p.ActivityDate == today);

        if (progress == null)
        {
            progress = new LearningProgress
            {
                UserId = userId,
                ActivityDate = today,
                FlashcardsReviewed = cardsStudied,
                FlashcardsKnow = knowCount,
                DocumentsRead = 0,
                PagesRead = 0,
                WordsClicked = 0,
                NewWordsSaved = 0,
                TotalWordsSaved = 0,
                WordsMastered = 0,
                StudySessionsDone = 0,
                LearnRoundsDone = 0,
                LearnCorrect = 0,
                MatchGamesDone = 0,
                QuizzesCompleted = 0,
                QuizTotalQuestions = 0,
                QuizCorrectAnswers = 0,
                StudyMinutes = 0,
                XpEarned = 0
            };
            _db.LearningProgresses.Add(progress);
        }
        else
        {
            progress.FlashcardsReviewed = (progress.FlashcardsReviewed ?? 0) + cardsStudied;
            progress.FlashcardsKnow = (progress.FlashcardsKnow ?? 0) + knowCount;
            _db.LearningProgresses.Update(progress);
        }
        await _db.SaveChangesAsync();

        await CheckAchievementsAsync(userId, stats);
    }
}
