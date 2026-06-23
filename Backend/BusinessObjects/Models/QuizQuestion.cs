using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class QuizQuestion
{
    public long Id { get; set; }

    public long SessionId { get; set; }

    public long VocabularyId { get; set; }

    // Flexible question kind, e.g. "multiple_choice_meaning", "multiple_choice_word",
    // "pinyin_match", "fill_in_blank", "example_match", "context". Stored as VARCHAR so
    // AI-generated questions are not constrained by a Postgres enum.
    public string? QuestionType { get; set; }

    public string QuestionText { get; set; } = null!;

    public string? Options { get; set; }

    public string CorrectAnswer { get; set; } = null!;

    public string? UserAnswer { get; set; }

    public bool? IsCorrect { get; set; }

    public int? ResponseMs { get; set; }

    // Static explanation supplied at generation time (from AI or local fallback).
    public string? Explanation { get; set; }

    // Personalized explanation produced during post-test AI analysis (wrong answers only).
    public string? AiExplanation { get; set; }

    // Position of the question within the test (1-based).
    public int? QuestionOrder { get; set; }

    public bool? Flagged { get; set; }

    public DateTime? AnsweredAt { get; set; }

    public virtual QuizSession Session { get; set; } = null!;

    public virtual Vocabulary Vocabulary { get; set; } = null!;
}
