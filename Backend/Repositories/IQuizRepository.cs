using BusinessObjects.Models;

namespace Repositories;

public interface IQuizRepository
{
    Task<QuizSession> CreateSessionAsync(QuizSession session);
    Task<QuizSession?> GetSessionAsync(long id);
    Task UpdateSessionAsync(QuizSession session);
    Task AddQuestionAsync(QuizQuestion question);
    Task AddQuestionsAsync(IEnumerable<QuizQuestion> questions);
    Task<QuizQuestion?> GetQuestionAsync(long id);
    Task UpdateQuestionAsync(QuizQuestion question);
    Task<List<QuizSession>> GetUserSessionsAsync(long userId);

    /// <summary>
    /// Most recent genuinely-resumable session for a user (status "In Progress" with at least
    /// one answered question), with questions loaded. Returns null for empty/abandoned sessions.
    /// </summary>
    Task<QuizSession?> GetLatestInProgressAsync(long userId);

    /// <summary>
    /// Mark every still-open ("In Progress") session for a user as "Abandoned" so only one
    /// session is ever active. Returns the number of sessions abandoned.
    /// </summary>
    Task<int> AbandonInProgressSessionsAsync(long userId);

    /// <summary>Persist the weak-word review list produced after grading.</summary>
    Task AddReviewsAsync(IEnumerable<QuizReview> reviews);
}
