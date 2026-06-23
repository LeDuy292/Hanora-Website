using BusinessObjects.Models;
using Repositories;

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
}

/// <summary>Shape the frontend consumes for the header/dashboard gamification.</summary>
public record UserStatsDto
{
    public int Streak { get; init; }
    public int LongestStreak { get; init; }
    public int Xp { get; init; }
    public int XpToday { get; init; }
    public int XpThisWeek { get; init; }
    public string Level { get; init; } = "HSK 1";
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

    // The streak rolls over at local midnight in Vietnam (UTC+7), so a login at
    // 00:01 ICT counts as a new day even though it's still "yesterday" in UTC.
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    public StatsService(IStatsRepository statsRepo)
    {
        _statsRepo = statsRepo;
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
        int totalXp = await _statsRepo.GetTotalXpAsync(userId);

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

    // Mirrors the XP→level thresholds the frontend already used for its mock profile.
    private static string LevelForXp(int xp)
    {
        if (xp > 800) return "HSK 4";
        if (xp > 500) return "HSK 3";
        if (xp > 200) return "HSK 2";
        return "HSK 1";
    }

    public async Task TrackTimeAsync(long userId, int minutes)
    {
        var today = TodayVn();
        await _statsRepo.IncrementStudyMinutesAsync(userId, today, minutes);
    }

    public async Task TrackPronunciationScoreAsync(long userId, double score)
    {
        await _statsRepo.UpdatePronunciationScoreAsync(userId, score);
    }
}
