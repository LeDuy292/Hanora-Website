using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class VwLeaderboardWeekly
{
    public long? Rank { get; set; }

    public long? UserId { get; set; }

    public string? Username { get; set; }

    public string? DisplayName { get; set; }

    public string? AvatarUrl { get; set; }

    public int? Xp { get; set; }

    public int? TotalWordsMastered { get; set; }

    public int? CurrentStreakDays { get; set; }
}
