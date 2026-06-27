using System;

namespace BusinessObjects.Models;

public partial class LeaderboardReward
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public int Rank { get; set; }

    public int XpRewarded { get; set; }

    public DateOnly WeekStart { get; set; }

    public DateTime? RewardedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
