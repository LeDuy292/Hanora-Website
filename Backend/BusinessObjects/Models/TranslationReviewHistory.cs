using System;

namespace BusinessObjects.Models;

public partial class TranslationReviewHistory
{
    public long Id { get; set; }

    public long ReviewId { get; set; }

    public long? AdminId { get; set; }

    public string Action { get; set; } = null!;

    public string? PreviousStatus { get; set; }

    public string? NewStatus { get; set; }

    public string? Note { get; set; }

    public string? SnapshotJson { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual TranslationReview Review { get; set; } = null!;

    public virtual User? Admin { get; set; }
}
