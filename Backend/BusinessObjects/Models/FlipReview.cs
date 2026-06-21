using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class FlipReview
{
    public long Id { get; set; }

    public long SessionId { get; set; }

    public long FlashcardId { get; set; }

    public FlipResult? Result { get; set; }

    public int? ResponseMs { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public virtual Flashcard Flashcard { get; set; } = null!;

    public virtual StudySession Session { get; set; } = null!;
}
