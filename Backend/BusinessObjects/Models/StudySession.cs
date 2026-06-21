using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class StudySession
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public FlashcardMode? Mode { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? EndedAt { get; set; }

    public int? TotalCards { get; set; }

    public int? CardsKnow { get; set; }

    public int? CardsStillLearning { get; set; }

    public int? CorrectAnswers { get; set; }

    public int? IncorrectAnswers { get; set; }

    public int? MatchTimeSeconds { get; set; }

    public decimal? ScorePercent { get; set; }

    public virtual ICollection<FlipReview> FlipReviews { get; set; } = new List<FlipReview>();

    public virtual ICollection<LearnRound> LearnRounds { get; set; } = new List<LearnRound>();

    public virtual MatchGame? MatchGame { get; set; }

    public virtual User User { get; set; } = null!;
}
