namespace Services;

public interface IQuizAiService
{
    bool IsConfigured { get; }

    /// <summary>Ask Deepseek to author questions for the given vocabulary. Returns null on failure.</summary>
    Task<List<AiQuestionDto>?> GenerateQuestionsAsync(
        IEnumerable<AiVocabItem> vocabulary,
        List<string> questionTypes,
        string difficulty,
        int questionCount);

    /// <summary>Ask Deepseek for personalized feedback + per-wrong-answer explanations. Returns null on failure.</summary>
    Task<AiAnalysisDto?> AnalyzeResultAsync(AiAnalysisRequest request);
}

// ---- Generation ----

public class AiVocabItem
{
    public string Word { get; set; } = null!;
    public string Pinyin { get; set; } = null!;
    public string Meaning { get; set; } = null!;
    public int MasteryLevel { get; set; }
}

public class AiQuestionDto
{
    public string? Word { get; set; }
    public string QuestionType { get; set; } = "multiple_choice_meaning";
    public string QuestionText { get; set; } = null!;
    public List<string> Options { get; set; } = new();
    public string CorrectAnswer { get; set; } = null!;
    public string? Explanation { get; set; }
}

// ---- Analysis ----

public class AiAnalysisRequest
{
    public string Difficulty { get; set; } = "medium";
    public int TimeSpentSeconds { get; set; }
    public decimal AccuracyPercent { get; set; }
    public List<AiAnalysisQuestion> Questions { get; set; } = new();
}

public class AiAnalysisQuestion
{
    public long QuestionId { get; set; }
    public string? Word { get; set; }
    public string QuestionText { get; set; } = null!;
    public string CorrectAnswer { get; set; } = null!;
    public string? UserAnswer { get; set; }
    public bool IsCorrect { get; set; }
}

public class AiAnalysisDto
{
    public string? Feedback { get; set; }
    public List<string>? Recommendations { get; set; }
    public List<AiWrongExplanation>? WrongExplanations { get; set; }
}

public class AiWrongExplanation
{
    public long QuestionId { get; set; }
    public string? Explanation { get; set; }
}
