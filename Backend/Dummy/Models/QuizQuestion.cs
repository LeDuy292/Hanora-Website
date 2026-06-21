using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class QuizQuestion
{
    public long Id { get; set; }

    public long SessionId { get; set; }

    public long VocabularyId { get; set; }

    public string QuestionText { get; set; } = null!;

    public string? Options { get; set; }

    public string CorrectAnswer { get; set; } = null!;

    public string? UserAnswer { get; set; }

    public bool? IsCorrect { get; set; }

    public int? ResponseMs { get; set; }

    public DateTime? AnsweredAt { get; set; }

    public virtual QuizSession Session { get; set; } = null!;

    public virtual Vocabulary Vocabulary { get; set; } = null!;
}
