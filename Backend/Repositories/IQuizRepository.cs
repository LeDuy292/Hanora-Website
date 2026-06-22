using BusinessObjects.Models;

namespace Repositories;

public interface IQuizRepository
{
    Task<QuizSession> CreateSessionAsync(QuizSession session);
    Task<QuizSession?> GetSessionAsync(long id);
    Task UpdateSessionAsync(QuizSession session);
    Task AddQuestionAsync(QuizQuestion question);
    Task<QuizQuestion?> GetQuestionAsync(long id);
    Task UpdateQuestionAsync(QuizQuestion question);
    Task<List<QuizSession>> GetUserSessionsAsync(long userId);
}
