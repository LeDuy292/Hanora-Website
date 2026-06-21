using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class MatchPair
{
    public long Id { get; set; }

    public long MatchGameId { get; set; }

    public long FlashcardId { get; set; }

    public DateTime? MatchedAt { get; set; }

    public int? AttemptCount { get; set; }

    public virtual Flashcard Flashcard { get; set; } = null!;

    public virtual MatchGame MatchGame { get; set; } = null!;
}
