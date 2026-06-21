using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class LearnRound
{
    public long Id { get; set; }

    public long SessionId { get; set; }

    public long FlashcardId { get; set; }

    public LearnQuestionType? QuestionType { get; set; }

    public LearnResult? Result { get; set; }

    public string? Options { get; set; }

    public string CorrectAnswer { get; set; } = null!;

    public string? UserAnswer { get; set; }

    public int? ResponseMs { get; set; }

    public DateTime? AnsweredAt { get; set; }

    public virtual Flashcard Flashcard { get; set; } = null!;

    public virtual StudySession Session { get; set; } = null!;
}
