using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class QuizSession
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public int TotalQuestions { get; set; }

    public int? CorrectAnswers { get; set; }

    public decimal? ScorePercent { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public virtual ICollection<QuizQuestion> QuizQuestions { get; set; } = new List<QuizQuestion>();

    public virtual User User { get; set; } = null!;
}
