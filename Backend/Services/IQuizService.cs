using BusinessObjects.Models;

namespace Services;

public interface IQuizService
{
    /// <summary>Create a practice test (AI-generated, with local fallback) from the user's flashcards.</summary>
    Task<QuizSession> CreateQuizAsync(long userId, StartTestRequest request);

    /// <summary>Save (not grade) a single answer while the test is in progress. Enables auto-save / resume.</summary>
    Task<bool> SaveAnswerAsync(QuizQuestionAnswerDto answer);

    /// <summary>Toggle the "flagged for review" marker on a question.</summary>
    Task<bool> FlagQuestionAsync(long questionId, bool flagged);

    /// <summary>Grade the test, update mastery, build the weak-word review list, and run AI analysis.</summary>
    Task<QuizSession?> FinishQuizAsync(long sessionId);

    /// <summary>Full session detail (questions + reviews) for review-screen / resume.</summary>
    Task<QuizSession?> GetQuizResultAsync(long sessionId);

    /// <summary>Completed-test history summaries for a user.</summary>
    Task<List<QuizHistoryItemDto>> GetHistoryAsync(long userId);

    /// <summary>Most recent unfinished session for a user, or null. Used to offer "Resume Test".</summary>
    Task<QuizSession?> GetInProgressAsync(long userId);
}

/// <summary>Test configuration chosen on the setup screen.</summary>
public class StartTestRequest
{
    public int QuestionCount { get; set; } = 10;

    // e.g. ["multiple_choice_meaning","pinyin_match","fill_in_blank"]. Empty => AI mixed mode.
    public List<string> QuestionTypes { get; set; } = new();

    public string Difficulty { get; set; } = "medium"; // easy | medium | hard | adaptive
}

public class QuizQuestionAnswerDto
{
    public long QuestionId { get; set; }
    public string? UserAnswer { get; set; }
    public int ResponseMs { get; set; }
    public bool UsedHint { get; set; }
}

public class QuizHistoryItemDto
{
    public long Id { get; set; }
    public int TotalQuestions { get; set; }
    public int? CorrectAnswers { get; set; }
    public int? Score { get; set; }
    public decimal? AccuracyPercent { get; set; }
    public int? Xp { get; set; }
    public int? TimeSpentSeconds { get; set; }
    public string? Difficulty { get; set; }
    public string? Status { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
