using System;

namespace BusinessObjects.Models;

/// <summary>
/// A vocabulary item flagged for review after a practice test
/// (answered wrong, answered too slowly, or low mastery).
/// </summary>
public partial class QuizReview
{
    public long Id { get; set; }

    public long SessionId { get; set; }

    public long? VocabularyId { get; set; }

    public string? ReviewReason { get; set; }   // 'wrong' | 'slow' | 'low_mastery'

    public DateTime? CreatedAt { get; set; }

    public virtual QuizSession Session { get; set; } = null!;

    public virtual Vocabulary? Vocabulary { get; set; }
}
