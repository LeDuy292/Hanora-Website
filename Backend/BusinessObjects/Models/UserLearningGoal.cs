using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class UserLearningGoal
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public int DailyMinutesGoal { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
