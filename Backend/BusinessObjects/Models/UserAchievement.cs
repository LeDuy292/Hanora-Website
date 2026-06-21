using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class UserAchievement
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public long AchievementId { get; set; }

    public DateTime? EarnedAt { get; set; }

    public virtual Achievement Achievement { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
