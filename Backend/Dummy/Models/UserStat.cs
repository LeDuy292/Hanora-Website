using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class UserStat
{
    public long UserId { get; set; }

    public int? TotalXp { get; set; }

    public int? TotalWordsSaved { get; set; }

    public int? TotalWordsMastered { get; set; }

    public int? TotalDocumentsRead { get; set; }

    public int? TotalStudySessions { get; set; }

    public int? TotalFlashcardsDone { get; set; }

    public int? TotalQuizzesDone { get; set; }

    public int? TotalStudyMinutes { get; set; }

    public int? CurrentStreakDays { get; set; }

    public int? LongestStreakDays { get; set; }

    public DateOnly? LastActiveDate { get; set; }

    public int? XpToday { get; set; }

    public int? XpThisWeek { get; set; }

    public int? XpThisMonth { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
