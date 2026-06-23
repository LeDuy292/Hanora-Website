using BusinessObjects.Models;

namespace Services;

public interface IQuizService
{
    Task<QuizSession> CreateQuizAsync(long userId, int questionCount = 10);
    Task<QuizSession?> SubmitQuizAsync(long sessionId, List<QuizQuestionAnswerDto> answers);
    Task<bool> SubmitAnswerAsync(QuizQuestionAnswerDto answer);
    Task<QuizSession?> FinishQuizAsync(long sessionId);
    Task<QuizSession?> GetQuizResultAsync(long sessionId);
}

public class QuizQuestionAnswerDto
{
    public long QuestionId { get; set; }
    public string UserAnswer { get; set; } = null!;
    public int ResponseMs { get; set; }
    public bool UsedHint { get; set; }
}
