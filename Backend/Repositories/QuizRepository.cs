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
            .Include(s => s.QuizQuestions)
            .ThenInclude(q => q.Vocabulary)
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
}
