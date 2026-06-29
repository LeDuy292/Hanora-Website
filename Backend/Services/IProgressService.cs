using BusinessObjects.Models;
using Repositories;

namespace Services;

public interface IProgressService
{
    /// <summary>
    /// Builds the aggregated Learning Progress Dashboard for a user. Every metric is
    /// computed live from the source tables that actually hold data (saved words, quiz
    /// sessions, study sessions, documents) plus the login streak on user_stats.
    /// </summary>
    Task<DashboardDto> GetDashboardAsync(long userId);
    Task SetGoalAsync(long userId, int minutes);
}

// ---- DTOs (shape the frontend consumes; mirrors the spec's dashboard JSON) ----

public record DashboardDto
{
    public int Streak { get; init; }
    public int Xp { get; init; }
    public int Level { get; init; }
    public int CurrentLevelXp { get; init; }
    public int NextLevelXp { get; init; }
    public double LevelProgressPercent { get; init; }
    public int WordsSaved { get; init; }
    public int WordsMastered { get; init; }
    public DailyGoalDto DailyGoal { get; init; } = new();
    public int ReviewToday { get; init; }
    public List<NotebookProgressDto> NotebookProgress { get; init; } = new();
    public List<GrowthPointDto> GrowthChart { get; init; } = new();
    public List<RecentDocumentDto> RecentDocuments { get; init; } = new();
    public WeeklyStatsDto WeeklyStats { get; init; } = new();
    public List<AchievementDto> Achievements { get; init; } = new();
}

public record DailyGoalDto
{
    public int Target { get; init; }
    public int Current { get; init; }
}

public record NotebookProgressDto
{
    public long DocumentId { get; init; }
    public string Title { get; init; } = "";
    public int Learned { get; init; }
    public int Total { get; init; }
}

public record GrowthPointDto
{
    public string Date { get; init; } = "";   // yyyy-MM-dd
    public int Count { get; init; }
}

public record RecentDocumentDto
{
    public long Id { get; init; }
    public string Title { get; init; } = "";
    public decimal ProgressPercent { get; init; }
    public int ReadingMinutes { get; init; }
    public int CharCount { get; init; }
    public string? LastReadAt { get; init; }
}

public record WeeklyStatsDto
{
    public int FlashcardsReviewed { get; init; }
    public int PracticeTests { get; init; }
    public int DocumentsRead { get; init; }
    public int StudyMinutes { get; init; }
    public int XpEarned { get; init; }
}

public record AchievementDto
{
    public string Code { get; init; } = "";
    public string Name { get; init; } = "";
    public string? Description { get; init; }
    public int XpReward { get; init; }
    public bool Unlocked { get; init; }
    public int Progress { get; init; }
    public int Target { get; init; }
}

public class ProgressService : IProgressService
{
    private readonly IProgressRepository _repo;
    private readonly IStatsRepository _statsRepo;

    // The dashboard's "today"/"this week" windows roll over at local midnight in
    // Vietnam (UTC+7), matching the streak logic in StatsService.
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    public ProgressService(IProgressRepository repo, IStatsRepository statsRepo)
    {
        _repo = repo;
        _statsRepo = statsRepo;
    }

    public async Task SetGoalAsync(long userId, int minutes)
    {
        await _statsRepo.SetDailyGoalMinutesAsync(userId, minutes);
    }

    private static DateOnly TodayVn() => DateOnly.FromDateTime(DateTime.UtcNow + VietnamOffset);

    /// <summary>Converts a Vietnam-local date to the UTC instant of its local midnight.</summary>
    private static DateTime VnDateToUtc(DateOnly localDate) =>
        DateTime.SpecifyKind(localDate.ToDateTime(TimeOnly.MinValue) - VietnamOffset, DateTimeKind.Utc);

    public async Task<DashboardDto> GetDashboardAsync(long userId)
    {
        var today = TodayVn();
        // Window boundaries as UTC instants.
        var todayStartUtc = VnDateToUtc(today);
        var tomorrowStartUtc = VnDateToUtc(today.AddDays(1));
        var weekStartUtc = VnDateToUtc(today.AddDays(-6)); // last 7 calendar days incl. today

        var stats = await _statsRepo.GetOrCreateStatsAsync(userId);
        int streak = stats.CurrentStreakDays ?? 0;

        int totalXp = await _repo.GetTotalXpAsync(userId);
        int level = StatsService.CalculateLevel(totalXp);
        int currentLevelXp = StatsService.GetLevelThreshold(level);
        int nextLevelXp = StatsService.GetLevelThreshold(level + 1);
        double levelProgressPercent = 0.0;
        if (nextLevelXp > currentLevelXp)
        {
            levelProgressPercent = Math.Round((double)(totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp) * 100.0, 2);
            if (levelProgressPercent < 0) levelProgressPercent = 0;
            if (levelProgressPercent > 100) levelProgressPercent = 100;
        }

        var savedWords = await _repo.GetSavedWordsAsync(userId);
        int reviewToday = CountDue(savedWords);

        int goalTarget = await _statsRepo.GetDailyGoalMinutesAsync(userId);
        int goalCurrent = await _statsRepo.GetMinutesOnDateAsync(userId, today);

        var notebook = (await _repo.GetNotebookProgressAsync(userId))
            .Select(n => new NotebookProgressDto
            {
                DocumentId = n.DocumentId,
                Title = n.Title,
                Learned = n.Learned,
                Total = n.Total,
            })
            .OrderByDescending(n => n.Learned)
            .ToList();

        var growth = BuildGrowthChart(savedWords, today);

        var recentDocs = (await _repo.GetRecentDocumentsAsync(userId, 6))
            .Select(d => new RecentDocumentDto
            {
                Id = d.Id,
                Title = d.Title,
                ProgressPercent = d.ProgressPercent,
                ReadingMinutes = d.ReadingMinutes,
                CharCount = d.CharCount,
                LastReadAt = (d.LastReadAt ?? d.CreatedAt)?.ToString("yyyy-MM-dd"),
            })
            .ToList();

        // Weekly stats over the last 7 days.
        var weekQuiz = await _repo.GetQuizStatsInRangeAsync(userId, weekStartUtc, tomorrowStartUtc);
        int weekFlips = await _repo.GetFlipReviewsInRangeAsync(userId, weekStartUtc, tomorrowStartUtc);
        int weeklyStudyMinutes = await _statsRepo.GetMinutesInRangeAsync(userId, today.AddDays(-6), today);
        var weekly = new WeeklyStatsDto
        {
            FlashcardsReviewed = weekFlips,
            PracticeTests = weekQuiz.count,
            // No reader write-path yet, so "documents read this week" stays 0 by design.
            DocumentsRead = 0,
            StudyMinutes = weeklyStudyMinutes,
            XpEarned = weekQuiz.xp,
        };

        var achievements = await BuildAchievementsAsync(userId, savedWords, streak);

        return new DashboardDto
        {
            Streak = streak,
            Xp = totalXp,
            Level = level,
            CurrentLevelXp = currentLevelXp,
            NextLevelXp = nextLevelXp,
            LevelProgressPercent = levelProgressPercent,
            WordsSaved = savedWords.Count,
            WordsMastered = savedWords.Count(w => w.IsMastered),
            DailyGoal = new DailyGoalDto { Target = goalTarget, Current = goalCurrent },
            ReviewToday = reviewToday,
            NotebookProgress = notebook,
            GrowthChart = growth,
            RecentDocuments = recentDocs,
            WeeklyStats = weekly,
            Achievements = achievements,
        };
    }

    // SRS due rule: not mastered, and either never reviewed or last reviewed longer ago
    // than its mastery interval (mastery_level+1 days). Mirrors the spec's priority intent.
    private static int CountDue(List<SavedWordRow> words)
    {
        var nowUtc = DateTime.UtcNow;
        return words.Count(w =>
            !w.IsMastered &&
            (w.LastReviewed == null ||
             w.LastReviewed.Value <= nowUtc.AddDays(-(w.MasteryLevel + 1))));
    }

    private static List<GrowthPointDto> BuildGrowthChart(List<SavedWordRow> words, DateOnly today)
    {
        // Count words saved per Vietnam-local day across the last 7 days, filling gaps with 0.
        var counts = words
            .Where(w => w.SavedAt != null)
            .Select(w => DateOnly.FromDateTime(w.SavedAt!.Value + VietnamOffset))
            .GroupBy(d => d)
            .ToDictionary(g => g.Key, g => g.Count());

        var points = new List<GrowthPointDto>(7);
        for (int i = 6; i >= 0; i--)
        {
            var day = today.AddDays(-i);
            counts.TryGetValue(day, out int c);
            points.Add(new GrowthPointDto { Date = day.ToString("yyyy-MM-dd"), Count = c });
        }
        return points;
    }

    private async Task<List<AchievementDto>> BuildAchievementsAsync(
        long userId, List<SavedWordRow> savedWords, int streak)
    {
        int savedCount = savedWords.Count;
        int masteredCount = savedWords.Count(w => w.IsMastered);
        int docCount = await _repo.GetDocumentCountAsync(userId);
        int quizCount = await _repo.GetCompletedQuizCountAsync(userId);
        bool perfectQuiz = await _repo.HasPerfectQuizAsync(userId);
        int flipCount = await _repo.GetTotalFlipReviewsAsync(userId);

        var defs = await _repo.GetAchievementsAsync();
        var result = new List<AchievementDto>(defs.Count);

        foreach (var a in defs)
        {
            // (current, target) per known achievement code; null target => no live source yet.
            (int current, int target) = a.Code switch
            {
                "streak_3" => (streak, 3),
                "streak_7" => (streak, 7),
                "streak_30" => (streak, 30),
                "vocab_10" => (savedCount, 10),
                "vocab_50" => (savedCount, 50),
                "vocab_100" => (savedCount, 100),
                "vocab_500" => (savedCount, 500),
                "mastered_10" => (masteredCount, 10),
                "mastered_100" => (masteredCount, 100),
                "first_doc" => (docCount, 1),
                "first_quiz" => (quizCount, 1),
                "perfect_quiz" => (perfectQuiz ? 1 : 0, 1),
                "flashcard_100" => (flipCount, 100),
                _ => (0, 0), // unknown / no live source (e.g. match_master, top10_weekly)
            };

            bool unlocked = target > 0 && current >= target;
            result.Add(new AchievementDto
            {
                Code = a.Code,
                Name = a.Name,
                Description = a.Description,
                XpReward = a.XpReward ?? 0,
                Unlocked = unlocked,
                Progress = target > 0 ? Math.Min(current, target) : 0,
                Target = target,
            });
        }

        return result;
    }

    private static int LevelForXp(int xp)
    {
        return StatsService.CalculateLevel(xp);
    }
}
