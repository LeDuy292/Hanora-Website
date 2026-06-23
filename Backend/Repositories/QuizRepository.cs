using BusinessObjects.Models;
using DataAccessObjects;
using Microsoft.EntityFrameworkCore;

namespace Repositories;

public class QuizRepository : IQuizRepository
{
    private readonly AppDbContext _db;

    public QuizRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<QuizSession> CreateSessionAsync(QuizSession session)
    {
        _db.QuizSessions.Add(session);
        await _db.SaveChangesAsync();
        return session;
    }

    public async Task<QuizSession?> GetSessionAsync(long id)
    {
        return await _db.QuizSessions
            .Include(s => s.QuizQuestions.OrderBy(q => q.QuestionOrder))
            .ThenInclude(q => q.Vocabulary)
            .Include(s => s.QuizReviews)
            .ThenInclude(r => r.Vocabulary)
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task UpdateSessionAsync(QuizSession session)
    {
        _db.QuizSessions.Update(session);
        await _db.SaveChangesAsync();
    }

    public async Task AddQuestionAsync(QuizQuestion question)
    {
        _db.QuizQuestions.Add(question);
        await _db.SaveChangesAsync();
    }

    public async Task AddQuestionsAsync(IEnumerable<QuizQuestion> questions)
    {
        _db.QuizQuestions.AddRange(questions);
        await _db.SaveChangesAsync();
    }

    public async Task<QuizQuestion?> GetQuestionAsync(long id)
    {
        return await _db.QuizQuestions
            .Include(q => q.Session)
            .FirstOrDefaultAsync(q => q.Id == id);
    }

    public async Task UpdateQuestionAsync(QuizQuestion question)
    {
        _db.QuizQuestions.Update(question);
        await _db.SaveChangesAsync();
    }

    public async Task<List<QuizSession>> GetUserSessionsAsync(long userId)
    {
        return await _db.QuizSessions
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.StartedAt)
            .ToListAsync();
    }

    public async Task<QuizSession?> GetLatestInProgressAsync(long userId)
    {
        return await _db.QuizSessions
            .Include(s => s.QuizQuestions.OrderBy(q => q.QuestionOrder))
            .ThenInclude(q => q.Vocabulary)
            .Where(s => s.UserId == userId
                        && s.Status == "In Progress"
                        // Only resumable if the user has actually answered something.
                        && s.QuizQuestions.Any(q => q.UserAnswer != null))
            .OrderByDescending(s => s.StartedAt)
            .FirstOrDefaultAsync();
    }

    public async Task<int> AbandonInProgressSessionsAsync(long userId)
    {
        var open = await _db.QuizSessions
            .Where(s => s.UserId == userId && s.Status == "In Progress")
            .ToListAsync();
        foreach (var s in open)
            s.Status = "Abandoned";
        if (open.Count > 0)
            await _db.SaveChangesAsync();
        return open.Count;
    }

    public async Task AddReviewsAsync(IEnumerable<QuizReview> reviews)
    {
        _db.QuizReviews.AddRange(reviews);
        await _db.SaveChangesAsync();
    }
}
