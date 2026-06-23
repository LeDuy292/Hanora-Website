using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class UserVocabulary
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public long VocabularyId { get; set; }

    public long? SourceDocumentId { get; set; }

    public int? SourcePage { get; set; }

    public string? PersonalNote { get; set; }

    public bool? IsMastered { get; set; }

    public int CorrectCount { get; set; } = 0;

    public int WrongCount { get; set; } = 0;

    public DateTime? LastReviewed { get; set; }

    public int MasteryLevel { get; set; } = 0;

    public DateTime? SavedAt { get; set; }

    public virtual Flashcard? Flashcard { get; set; }

    public virtual Document? SourceDocument { get; set; }

    public virtual User User { get; set; } = null!;

    public virtual Vocabulary Vocabulary { get; set; } = null!;
}
