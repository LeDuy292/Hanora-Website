using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class TranslationReview
{
    public long Id { get; set; }

    public string SourceType { get; set; } = null!;

    public long? SourceEntityId { get; set; }

    public long? UserId { get; set; }

    public string SourceLanguage { get; set; } = "ZH";

    public string TargetLanguage { get; set; } = "VI";

    public string SourceText { get; set; } = null!;

    public string? CurrentTranslation { get; set; }

    public string? ProposedTranslation { get; set; }

    public string? AiExplanation { get; set; }

    public string? ExampleText { get; set; }

    public string? Pinyin { get; set; }

    public string? WordType { get; set; }

    public string WarningType { get; set; } = "new_word";

    public decimal? ConfidenceScore { get; set; }

    public int ReportCount { get; set; }

    public int Priority { get; set; }

    public string Status { get; set; } = "Pending";

    public string? AdminNote { get; set; }

    public long? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual User? User { get; set; }

    public virtual User? ReviewedByNavigation { get; set; }

    public virtual ICollection<TranslationReviewHistory> History { get; set; } = new List<TranslationReviewHistory>();
}
