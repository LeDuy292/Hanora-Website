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

            DateTime startOfWeekUtc = DateTime.SpecifyKind(startOfWeek.ToDateTime(TimeOnly.MinValue) - VietnamOffset, DateTimeKind.Utc);
            DateTime startOfMonthUtc = DateTime.SpecifyKind(startOfMonth.ToDateTime(TimeOnly.MinValue) - VietnamOffset, DateTimeKind.Utc);

            // 1. Fetch active users and user stats
            var rawUsers = await _db.Users
                .Where(u => u.IsActive == true)
                .Include(u => u.UserStat)
                .ToListAsync();

            // Filter users: only show users with at least one learning activity
            rawUsers = rawUsers.Where(u => u.UserStat != null && 
                ((u.UserStat.TotalXp ?? 0) > 0 ||
                 (u.UserStat.TotalWordsSaved ?? 0) > 0 ||
                 (u.UserStat.TotalFlashcardsDone ?? 0) > 0 ||
                 (u.UserStat.TotalQuizzesDone ?? 0) > 0 ||
                 (u.UserStat.TotalStudyMinutes ?? 0) > 0)).ToList();

            // 2. Fetch progress logs and reading progress to compute period stats
            var progressLogs = await _db.LearningProgresses.ToListAsync();
            var readingProgressList = await _db.DocumentReadingProgresses.Include(p => p.Document).ToListAsync();

            // 3. Calculate score for each user
            var list = new List<LeaderboardUserDto>();
            foreach (var u in rawUsers)
            {
                var stats = u.UserStat!;
                int totalXp = stats.TotalXp ?? 0;
                int currentStreak = stats.CurrentStreakDays ?? 0;

                // All time values
                int allTimeVocab = stats.TotalWordsSaved ?? 0;
                int allTimePractice = (stats.TotalFlashcardsDone ?? 0) + (stats.TotalQuizzesDone ?? 0);
                int allTimeReadingDocs = stats.TotalDocumentsRead ?? 0;
                int allTimeReadingMins = stats.TotalStudyMinutes ?? 0;
                double allTimeReadingChars = readingProgressList
                    .Where(p => p.UserId == u.Id)
                    .Sum(p => (p.Document != null && p.Document.ExtractedText != null)
                        ? ((double)(p.ProgressPercent ?? 0) / 100.0 * p.Document.ExtractedText.Length)
                        : 0.0);

                // Period values
                int periodXp = totalXp;
                int periodVocab = allTimeVocab;
                int periodPractice = allTimePractice;
                int periodReadingDocs = allTimeReadingDocs;
                int periodReadingMins = allTimeReadingMins;
                double periodReadingChars = allTimeReadingChars;

                if (period == "weekly" || period == "monthly")
                {
                    DateOnly dateBoundary = period == "weekly" ? startOfWeek : startOfMonth;
                    DateTime timeBoundaryUtc = period == "weekly" ? startOfWeekUtc : startOfMonthUtc;

                    periodXp = period == "weekly" ? (stats.XpThisWeek ?? 0) : (stats.XpThisMonth ?? 0);
                    
                    var userProgress = progressLogs.Where(p => p.UserId == u.Id && p.ActivityDate >= dateBoundary).ToList();
                    periodVocab = userProgress.Sum(p => p.NewWordsSaved ?? 0);
                    periodPractice = userProgress.Sum(p => (p.FlashcardsReviewed ?? 0) + (p.QuizzesCompleted ?? 0));
                    periodReadingDocs = userProgress.Sum(p => p.DocumentsRead ?? 0);
                    periodReadingMins = userProgress.Sum(p => p.StudyMinutes ?? 0);

                    periodReadingChars = readingProgressList
                        .Where(p => p.UserId == u.Id && p.LastReadAt >= timeBoundaryUtc)
                        .Sum(p => (p.Document != null && p.Document.ExtractedText != null)
                            ? ((double)(p.ProgressPercent ?? 0) / 100.0 * p.Document.ExtractedText.Length)
                            : 0.0);
                }

                double finalScore = 0;
                string? secondaryValue = null;
                int xpToShow = period == "global" ? totalXp : periodXp;

                if (criteria == "vocabulary")
                {
                    finalScore = period == "global" ? allTimeVocab : periodVocab;
                    secondaryValue = $"{finalScore} từ";
                }
                else if (criteria == "practice")
                {
                    finalScore = period == "global" ? allTimePractice : periodPractice;
                    secondaryValue = $"{finalScore} lượt";
                }
                else if (criteria == "reading")
                {
                    int mins = period == "global" ? allTimeReadingMins : periodReadingMins;
                    int docs = period == "global" ? allTimeReadingDocs : periodReadingDocs;
                    double chars = period == "global" ? allTimeReadingChars : periodReadingChars;
                    
                    finalScore = mins + (docs * 50) + (chars / 100.0);
                    secondaryValue = $"{docs} tài liệu";
                }
                else if (criteria == "pronunciation")
                {
                    finalScore = (double)(stats.AveragePronunciationScore ?? 0.00m);
                    secondaryValue = stats.TotalPronunciationAttempts > 0 ? $"{finalScore:F1} điểm" : "Chưa thử";
                }
                else // default/XP
                {
                    finalScore = xpToShow;
                    secondaryValue = period == "global" ? $"{finalScore} XP" : $"+{finalScore} XP";
                }

                // Skip pronunciation if no attempts
                if (criteria == "pronunciation" && stats.TotalPronunciationAttempts == 0)
                {
                    continue;
                }

                list.Add(new LeaderboardUserDto
                {
                    UserId = u.Id,
                    Username = u.Username,
                    DisplayName = u.DisplayName ?? u.Username,
                    AvatarUrl = u.AvatarUrl,
                    Level = StatsService.CalculateLevel(totalXp),
                    Score = finalScore,
                    Streak = currentStreak,
                    Xp = xpToShow,
                    SecondaryValue = secondaryValue
                });
            }

            // 4. Sort list and assign ranks
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

            // 5. Split into Top 3 and remaining (Top 10 total)
            var top3 = sortedList.Take(3).ToList();
            var rankings = sortedList.Skip(3).Take(7).ToList(); // Only return ranks 4 to 10 for Top 10 limit!

            // 6. Find current user card info (can be outside Top 10)
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
                        "practice" => "lượt thực hành",
                        "reading" => "điểm đọc",
                        "pronunciation" => "điểm phát âm",
                        _ => period == "global" ? "XP" : "XP"
                    };
                    nextRankDiffText = $"Cần thêm {diff:F1} {unit} để đạt Hạng #{targetUser.Rank}";
                }

                currentUserDto = currentUserDto with { SecondaryValue = nextRankDiffText };
            }

            // 7. Calculate Hall of Fame
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
