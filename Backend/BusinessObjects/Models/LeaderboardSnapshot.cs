using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class LeaderboardSnapshot
{
    public long Id { get; set; }

    public LeaderboardPeriod? Period { get; set; }

    public DateOnly SnapshotDate { get; set; }

    public int Rank { get; set; }

    public long UserId { get; set; }

    public int XpTotal { get; set; }

    public int WordsMastered { get; set; }

    public int StreakDays { get; set; }

    public virtual User User { get; set; } = null!;
}
