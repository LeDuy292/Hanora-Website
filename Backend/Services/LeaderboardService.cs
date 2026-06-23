using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BusinessObjects.Models;
using DataAccessObjects;
using Microsoft.EntityFrameworkCore;
using Repositories;

namespace Services
{
    public class LeaderboardService : ILeaderboardService
    {
        private readonly AppDbContext _db;
        private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

        public LeaderboardService(AppDbContext db)
        {
            _db = db;
        }

        private static DateOnly TodayVn() => DateOnly.FromDateTime(DateTime.UtcNow + VietnamOffset);

        private static int LevelForXp(int xp)
        {
            if (xp >= 1000) return 5 + (xp - 1000) / 1000;
            if (xp >= 600) return 4;
            if (xp >= 300) return 3;
            if (xp >= 100) return 2;
            return 1;
        }

        public async Task<LeaderboardResultDto> GetLeaderboardAsync(long userId, string period, string criteria)
        {
            period = (period ?? "global").ToLower();
            criteria = (criteria ?? "default").ToLower();

            DateOnly today = TodayVn();
            DateOnly startOfWeek = today.AddDays(-(7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7);
            DateOnly startOfMonth = new DateOnly(today.Year, today.Month, 1);

            // 1. Fetch active users and user stats
            var rawUsers = await _db.Users
                .Where(u => u.IsActive == true)
                .Include(u => u.UserStat)
                .ToListAsync();

            // 2. Fetch achievement bonuses
            var achievementBonusDict = await _db.UserAchievements
                .GroupBy(ua => ua.UserId)
                .Select(g => new {
                    UserId = g.Key,
                    Bonus = g.Sum(ua => ua.Achievement.XpReward ?? 0)
                })
                .ToDictionaryAsync(x => x.UserId, x => x.Bonus);

            // 3. Fetch period progress stats if needed
            Dictionary<long, int> periodVocab = new();
            Dictionary<long, int> periodPractice = new();
            Dictionary<long, int> periodReading = new();

            if (period == "weekly" || period == "monthly")
            {
                DateOnly boundary = period == "weekly" ? startOfWeek : startOfMonth;

                var progressAggr = await _db.LearningProgresses
                    .Where(p => p.ActivityDate >= boundary)
                    .GroupBy(p => p.UserId)
                    .Select(g => new {
                        UserId = g.Key,
                        WordsMastered = g.Sum(p => p.WordsMastered ?? 0),
                        QuizzesCompleted = g.Sum(p => p.QuizzesCompleted ?? 0),
                        DocumentsRead = g.Sum(p => p.DocumentsRead ?? 0)
                    })
                    .ToListAsync();

                periodVocab = progressAggr.ToDictionary(x => x.UserId, x => x.WordsMastered);
                periodPractice = progressAggr.ToDictionary(x => x.UserId, x => x.QuizzesCompleted);
                periodReading = progressAggr.ToDictionary(x => x.UserId, x => x.DocumentsRead);
            }

            // 4. Calculate score for each user
            var list = new List<LeaderboardUserDto>();
            foreach (var u in rawUsers)
            {
                var stats = u.UserStat;
                if (stats == null) continue;

                int totalXp = stats.TotalXp ?? 0;
                int currentStreak = stats.CurrentStreakDays ?? 0;
                int totalWordsMastered = stats.TotalWordsMastered ?? 0;
                int totalQuizzesDone = stats.TotalQuizzesDone ?? 0;
                int totalDocsRead = stats.TotalDocumentsRead ?? 0;
                double avgPronunciation = (double)(stats.AveragePronunciationScore ?? 0.00m);

                // Calculate achievements bonus
                achievementBonusDict.TryGetValue(u.Id, out int achievementBonus);

                // Calculate streak bonus
                int streakBonus = currentStreak >= 365 ? 1000 :
                                  currentStreak >= 180 ? 500 :
                                  currentStreak >= 90  ? 300 :
                                  currentStreak >= 30  ? 150 :
                                  currentStreak >= 7   ? 50 : 0;

                // Calculate vocabulary bonus
                int vocabBonus = totalWordsMastered >= 3000 ? 1500 :
                                 totalWordsMastered >= 1000 ? 500 :
                                 totalWordsMastered >= 500  ? 200 :
                                 totalWordsMastered >= 100  ? 50 : 0;

                int globalRankingScore = totalXp + achievementBonus + streakBonus + vocabBonus;

                double finalScore = 0;
                string? secondaryValue = null;
                int xpUsed = totalXp;

                // Determine sorting values and secondary info text based on filters
                if (period == "global")
                {
                    if (criteria == "default")
                    {
                        finalScore = globalRankingScore;
                        secondaryValue = $"{globalRankingScore} điểm";
                    }
                    else if (criteria == "vocabulary")
                    {
                        finalScore = totalWordsMastered;
                        secondaryValue = $"{totalWordsMastered} từ";
                    }
                    else if (criteria == "practice")
                    {
                        finalScore = totalQuizzesDone;
                        secondaryValue = $"{totalQuizzesDone} bài quiz";
                    }
                    else if (criteria == "reading")
                    {
                        finalScore = totalDocsRead;
                        secondaryValue = $"{totalDocsRead} tài liệu";
                    }
                    else if (criteria == "pronunciation")
                    {
                        finalScore = avgPronunciation;
                        secondaryValue = stats.TotalPronunciationAttempts > 0 ? $"{avgPronunciation:F1} điểm" : "Chưa thử";
                    }
                }
                else // weekly or monthly
                {
                    xpUsed = period == "weekly" ? (stats.XpThisWeek ?? 0) : (stats.XpThisMonth ?? 0);

                    if (criteria == "default")
                    {
                        finalScore = xpUsed;
                        secondaryValue = $"+{xpUsed} XP";
                    }
                    else if (criteria == "vocabulary")
                    {
                        periodVocab.TryGetValue(u.Id, out int pv);
                        finalScore = pv;
                        secondaryValue = $"{pv} từ";
                    }
                    else if (criteria == "practice")
                    {
                        periodPractice.TryGetValue(u.Id, out int pp);
                        finalScore = pp;
                        secondaryValue = $"{pp} bài quiz";
                    }
                    else if (criteria == "reading")
                    {
                        periodReading.TryGetValue(u.Id, out int pr);
                        finalScore = pr;
                        secondaryValue = $"{pr} tài liệu";
                    }
                    else if (criteria == "pronunciation")
                    {
                        // Pronunciation uses all-time average since it is not logged daily
                        finalScore = avgPronunciation;
                        secondaryValue = stats.TotalPronunciationAttempts > 0 ? $"{avgPronunciation:F1} điểm" : "Chưa thử";
                    }
                }

                // If sorting by pronunciation, skip users who haven't done pronunciation tests yet
                if (criteria == "pronunciation" && stats.TotalPronunciationAttempts == 0)
                {
                    // Do not show them on the leaderboard if they haven't tried
                    continue;
                }

                list.Add(new LeaderboardUserDto
                {
                    UserId = u.Id,
                    Username = u.Username,
                    DisplayName = u.DisplayName ?? u.Username,
                    AvatarUrl = u.AvatarUrl,
                    Level = LevelForXp(totalXp),
                    Score = finalScore,
                    Streak = currentStreak,
                    Xp = xpUsed,
                    SecondaryValue = secondaryValue
                });
            }

            // 5. Sort list and assign ranks
            var sortedList = list
                .OrderByDescending(x => x.Score)
                .ThenByDescending(x => x.UserId) // break ties consistently
                .Select((item, index) => new LeaderboardUserDto
                {
                    Rank = index + 1,
                    UserId = item.UserId,
                    Username = item.Username,
                    DisplayName = item.DisplayName,
                    AvatarUrl = item.AvatarUrl,
                    Level = item.Level,
                    Score = item.Score,
                    Streak = item.Streak,
                    Xp = item.Xp,
                    SecondaryValue = item.SecondaryValue
                })
                .ToList();

            // 6. Split into Top 3 and remaining
            var top3 = sortedList.Take(3).ToList();
            var rankings = sortedList.Skip(3).Take(97).ToList(); // Top 100 overall

            // 7. Find current user card info
            var currentUserDto = sortedList.FirstOrDefault(x => x.UserId == userId);
            if (currentUserDto != null)
            {
                string nextRankDiffText = "Bạn đang dẫn đầu bảng xếp hạng!";
                if (currentUserDto.Rank > 1)
                {
                    var targetUser = sortedList[currentUserDto.Rank - 2];
                    double diff = targetUser.Score - currentUserDto.Score;
                    string unit = criteria switch
                    {
                        "vocabulary" => "từ",
                        "practice" => "bài quiz",
                        "reading" => "tài liệu",
                        "pronunciation" => "điểm phát âm",
                        _ => period == "global" ? "điểm" : "XP"
                    };
                    nextRankDiffText = $"Cần thêm {diff:F1} {unit} để đạt Hạng #{targetUser.Rank}";
                }

                currentUserDto = currentUserDto with { SecondaryValue = nextRankDiffText };
            }

            // 8. Calculate Hall of Fame (always all-time based)
            var hallOfFame = await CalculateHallOfFameAsync(rawUsers);

            return new LeaderboardResultDto
            {
                CurrentUser = currentUserDto,
                Top3 = top3,
                Rankings = rankings,
                HallOfFame = hallOfFame
            };
        }

        private Task<HallOfFameDto> CalculateHallOfFameAsync(List<User> users)
        {
            var vocabKingUser = users
                .Where(u => u.UserStat != null && (u.UserStat.TotalWordsMastered ?? 0) > 0)
                .OrderByDescending(u => u.UserStat!.TotalWordsMastered ?? 0)
                .FirstOrDefault();

            var practiceMasterUser = users
                .Where(u => u.UserStat != null && (u.UserStat.TotalQuizzesDone ?? 0) > 0)
                .OrderByDescending(u => u.UserStat!.TotalQuizzesDone ?? 0)
                .FirstOrDefault();

            var readingChampionUser = users
                .Where(u => u.UserStat != null && (u.UserStat.TotalDocumentsRead ?? 0) > 0)
                .OrderByDescending(u => u.UserStat!.TotalDocumentsRead ?? 0)
                .FirstOrDefault();

            var pronunciationMasterUser = users
                .Where(u => u.UserStat != null && (u.UserStat.TotalPronunciationAttempts ?? 0) > 0)
                .OrderByDescending(u => (double)(u.UserStat!.AveragePronunciationScore ?? 0))
                .FirstOrDefault();

            var longestStreakUser = users
                .Where(u => u.UserStat != null && (u.UserStat.LongestStreakDays ?? 0) > 0)
                .OrderByDescending(u => u.UserStat!.LongestStreakDays ?? 0)
                .FirstOrDefault();

            var result = new HallOfFameDto
            {
                VocabularyKing = vocabKingUser == null ? null : new HallOfFameWinnerDto
                {
                    DisplayName = vocabKingUser.DisplayName ?? vocabKingUser.Username,
                    AvatarUrl = vocabKingUser.AvatarUrl,
                    Value = vocabKingUser.UserStat!.TotalWordsMastered ?? 0,
                    Label = "Thành thạo nhiều từ nhất"
                },
                PracticeMaster = practiceMasterUser == null ? null : new HallOfFameWinnerDto
                {
                    DisplayName = practiceMasterUser.DisplayName ?? practiceMasterUser.Username,
                    AvatarUrl = practiceMasterUser.AvatarUrl,
                    Value = practiceMasterUser.UserStat!.TotalQuizzesDone ?? 0,
                    Label = "Làm nhiều bài test nhất"
                },
                ReadingChampion = readingChampionUser == null ? null : new HallOfFameWinnerDto
                {
                    DisplayName = readingChampionUser.DisplayName ?? readingChampionUser.Username,
                    AvatarUrl = readingChampionUser.AvatarUrl,
                    Value = readingChampionUser.UserStat!.TotalDocumentsRead ?? 0,
                    Label = "Đọc nhiều tài liệu nhất"
                },
                PronunciationMaster = pronunciationMasterUser == null ? null : new HallOfFameWinnerDto
                {
                    DisplayName = pronunciationMasterUser.DisplayName ?? pronunciationMasterUser.Username,
                    AvatarUrl = pronunciationMasterUser.AvatarUrl,
                    Value = (double)(pronunciationMasterUser.UserStat!.AveragePronunciationScore ?? 0),
                    Label = "Điểm phát âm cao nhất"
                },
                LongestStreak = longestStreakUser == null ? null : new HallOfFameWinnerDto
                {
                    DisplayName = longestStreakUser.DisplayName ?? longestStreakUser.Username,
                    AvatarUrl = longestStreakUser.AvatarUrl,
                    Value = longestStreakUser.UserStat!.LongestStreakDays ?? 0,
                    Label = "Chuỗi học dài nhất"
                }
            };

            return Task.FromResult(result);
        }
    }
}
