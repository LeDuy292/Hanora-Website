using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BusinessObjects.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Services
{
    public class LeaderboardWeeklyRewardWorker : BackgroundService
    {
        private readonly ILogger<LeaderboardWeeklyRewardWorker> _logger;
        private readonly IServiceProvider _serviceProvider;

        public LeaderboardWeeklyRewardWorker(
            ILogger<LeaderboardWeeklyRewardWorker> logger,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Leaderboard Weekly Reward Worker is starting.");

            // Wait a short time after startup before the first run
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var db = scope.ServiceProvider.GetRequiredService<DataAccessObjects.AppDbContext>();
                        var statsService = scope.ServiceProvider.GetRequiredService<IStatsService>();

                        var nowVn = DateTime.UtcNow + TimeSpan.FromHours(7);
                        var todayVn = DateOnly.FromDateTime(nowVn);
                        var thisMonday = todayVn.AddDays(-(7 + (todayVn.DayOfWeek - DayOfWeek.Monday)) % 7);
                        var lastMonday = thisMonday.AddDays(-7);

                        // Only distribute rewards if we are past the Monday 00:00 mark for the previous week
                        // and we haven't already distributed rewards for lastMonday.
                        bool alreadyRewarded = await db.LeaderboardRewards.AnyAsync(r => r.WeekStart == lastMonday, stoppingToken);
                        if (!alreadyRewarded)
                        {
                            _logger.LogInformation("Distributing leaderboard rewards for week starting {WeekStart}", lastMonday);

                            // Fetch users who earned XP during the target week, ordered by XP earned
                            var weeklyXps = await db.LearningProgresses
                                .Where(p => p.ActivityDate >= lastMonday && p.ActivityDate < thisMonday)
                                .GroupBy(p => p.UserId)
                                .Select(g => new
                                {
                                    UserId = g.Key,
                                    XpEarned = g.Sum(p => p.XpEarned ?? 0)
                                })
                                .Where(x => x.XpEarned > 0)
                                .OrderByDescending(x => x.XpEarned)
                                .ThenBy(x => x.UserId)
                                .Take(10)
                                .ToListAsync(stoppingToken);

                            if (weeklyXps.Any())
                            {
                                for (int i = 0; i < weeklyXps.Count; i++)
                                {
                                    var item = weeklyXps[i];
                                    int rank = i + 1;
                                    int rewardXp = rank switch
                                    {
                                        1 => 1000,
                                        2 => 700,
                                        3 => 500,
                                        4 or 5 => 300,
                                        _ => 200
                                    };

                                    // 1. Save reward log
                                    var rewardRecord = new LeaderboardReward
                                    {
                                        UserId = item.UserId,
                                        Rank = rank,
                                        XpRewarded = rewardXp,
                                        WeekStart = lastMonday,
                                        RewardedAt = DateTime.UtcNow
                                    };
                                    db.LeaderboardRewards.Add(rewardRecord);
                                    await db.SaveChangesAsync(stoppingToken);

                                    // 2. Award XP
                                    await statsService.AwardXpAsync(item.UserId, rewardXp, $"Phần thưởng Bảng xếp hạng tuần (Hạng {rank})");

                                    // 3. Send Notification
                                    var notif = new UserNotification
                                    {
                                        UserId = item.UserId,
                                        Title = "Phần thưởng Tuần!",
                                        Message = $"Chúc mừng bạn đã đạt Hạng {rank} tuần trước và nhận được +{rewardXp} XP!",
                                        IsRead = false,
                                        CreatedAt = DateTime.UtcNow
                                    };
                                    db.UserNotifications.Add(notif);
                                    await db.SaveChangesAsync(stoppingToken);
                                }
                            }
                            else
                            {
                                // Mark the week start as processed using a dummy system log row if users exist
                                var anyUser = await db.Users.FirstOrDefaultAsync(stoppingToken);
                                if (anyUser != null)
                                {
                                    var markProcessed = new LeaderboardReward
                                    {
                                        UserId = anyUser.Id,
                                        Rank = 0,
                                        XpRewarded = 0,
                                        WeekStart = lastMonday,
                                        RewardedAt = DateTime.UtcNow
                                    };
                                    db.LeaderboardRewards.Add(markProcessed);
                                    await db.SaveChangesAsync(stoppingToken);
                                }
                            }

                            _logger.LogInformation("Successfully distributed leaderboard rewards for week starting {WeekStart}", lastMonday);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while distributing leaderboard rewards.");
                }

                // Poll every hour
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }

            _logger.LogInformation("Leaderboard Weekly Reward Worker is stopping.");
        }
    }
}
