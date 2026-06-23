using BusinessObjects.Models;
using DataAccessObjects;
using Microsoft.EntityFrameworkCore;

namespace Repositories
{
    /// <summary>Raw projection of a saved word used for SRS/notebook/growth aggregation.</summary>
    public record SavedWordRow(long? SourceDocumentId, bool IsMastered, int MasteryLevel,
        int WrongCount, DateTime? LastReviewed, DateTime? SavedAt);

    /// <summary>A document the user owns, with optional reading-progress overlay.</summary>
    public record RecentDocRow(long Id, string Title, int CharCount, DateTime? CreatedAt,
        decimal ProgressPercent, int ReadingMinutes, DateTime? LastReadAt);

    /// <summary>Per-document saved-word counts for the vocabulary notebook.</summary>
    public record NotebookRow(long DocumentId, string Title, int Learned, int Total);

    /// <summary>Read-only aggregation queries for the Learning Progress Dashboard.</summary>
    public interface IProgressRepository
    {
        Task<List<SavedWordRow>> GetSavedWordsAsync(long userId);
        Task<List<NotebookRow>> GetNotebookProgressAsync(long userId);
        Task<List<RecentDocRow>> GetRecentDocumentsAsync(long userId, int take);

        /// <summary>Total XP = sum of XP from completed quiz sessions (the only XP source).</summary>
        Task<int> GetTotalXpAsync(long userId);
        /// <summary>Completed quiz sessions whose CompletedAt is within [fromUtc, toUtc).</summary>
        Task<(int count, int xp, int timeSeconds)> GetQuizStatsInRangeAsync(long userId, DateTime fromUtc, DateTime toUtc);
        /// <summary>Count of completed quiz sessions all-time.</summary>
        Task<int> GetCompletedQuizCountAsync(long userId);
        /// <summary>Whether the user has ever scored 100% on a completed quiz.</summary>
        Task<bool> HasPerfectQuizAsync(long userId);

        /// <summary>Total study-session minutes (ended-started) within [fromUtc, toUtc).</summary>
        Task<int> GetStudyMinutesInRangeAsync(long userId, DateTime fromUtc, DateTime toUtc);
        /// <summary>Flip-card reviews recorded within [fromUtc, toUtc).</summary>
        Task<int> GetFlipReviewsInRangeAsync(long userId, DateTime fromUtc, DateTime toUtc);
        /// <summary>All-time flip-card review count.</summary>
        Task<int> GetTotalFlipReviewsAsync(long userId);

        Task<int> GetDocumentCountAsync(long userId);
        Task<List<Achievement>> GetAchievementsAsync();
    }

    public class ProgressRepository : IProgressRepository
    {
        private readonly AppDbContext _db;

        public ProgressRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<SavedWordRow>> GetSavedWordsAsync(long userId)
        {
            return await _db.UserVocabularies
                .Where(uv => uv.UserId == userId)
                .Select(uv => new SavedWordRow(
                    uv.SourceDocumentId,
                    uv.IsMastered ?? false,
                    uv.MasteryLevel,
                    uv.WrongCount,
                    uv.LastReviewed,
                    uv.SavedAt))
                .ToListAsync();
        }

        public async Task<List<NotebookRow>> GetNotebookProgressAsync(long userId)
        {
            // Count saved words per source document first, then join to documents.
            // EF Core 8 can't translate GroupBy(...).Join(...) with an aggregate in the
            // result selector, so we materialize the grouped counts into a flat shape.
            var counts = await _db.UserVocabularies
                .Where(uv => uv.UserId == userId && uv.SourceDocumentId != null)
                .GroupBy(uv => uv.SourceDocumentId!.Value)
                .Select(g => new { DocumentId = g.Key, Learned = g.Count() })
                .ToListAsync();

            if (counts.Count == 0)
                return new List<NotebookRow>();

            var docIds = counts.Select(c => c.DocumentId).ToList();
            var docs = await _db.Documents
                .Where(d => docIds.Contains(d.Id))
                .Select(d => new { d.Id, d.Title, Total = d.TotalVocabularyCount ?? 0 })
                .ToListAsync();

            return counts
                .Join(docs,
                    c => c.DocumentId,
                    d => d.Id,
                    (c, d) => new NotebookRow(d.Id, d.Title, c.Learned, d.Total))
                .ToList();
        }

        public async Task<List<RecentDocRow>> GetRecentDocumentsAsync(long userId, int take)
        {
            return await _db.Documents
                .Where(d => d.UserId == userId)
                .OrderByDescending(d => d.UpdatedAt ?? d.CreatedAt)
                .Take(take)
                .Select(d => new RecentDocRow(
                    d.Id,
                    d.Title,
                    d.ExtractedText != null ? d.ExtractedText.Length : 0,
                    d.CreatedAt,
                    _db.DocumentReadingProgresses
                        .Where(p => p.UserId == userId && p.DocumentId == d.Id)
                        .Select(p => p.ProgressPercent ?? 0m)
                        .FirstOrDefault(),
                    _db.DocumentReadingProgresses
                        .Where(p => p.UserId == userId && p.DocumentId == d.Id)
                        .Select(p => p.ReadingMinutes ?? 0)
                        .FirstOrDefault(),
                    _db.DocumentReadingProgresses
                        .Where(p => p.UserId == userId && p.DocumentId == d.Id)
                        .Select(p => p.LastReadAt)
                        .FirstOrDefault()))
                .ToListAsync();
        }

        public async Task<int> GetTotalXpAsync(long userId)
        {
            return await _db.QuizSessions
                .Where(q => q.UserId == userId && q.Status == "Completed")
                .SumAsync(q => q.Xp ?? 0);
        }

        public async Task<(int count, int xp, int timeSeconds)> GetQuizStatsInRangeAsync(long userId, DateTime fromUtc, DateTime toUtc)
        {
            var rows = await _db.QuizSessions
                .Where(q => q.UserId == userId && q.Status == "Completed"
                    && q.CompletedAt >= fromUtc && q.CompletedAt < toUtc)
                .Select(q => new { Xp = q.Xp ?? 0, Time = q.TimeSpentSeconds ?? 0 })
                .ToListAsync();

            return (rows.Count, rows.Sum(r => r.Xp), rows.Sum(r => r.Time));
        }

        public async Task<int> GetCompletedQuizCountAsync(long userId)
        {
            return await _db.QuizSessions
                .CountAsync(q => q.UserId == userId && q.Status == "Completed");
        }

        public async Task<bool> HasPerfectQuizAsync(long userId)
        {
            return await _db.QuizSessions
                .AnyAsync(q => q.UserId == userId && q.Status == "Completed"
                    && q.AccuracyPercent >= 100m);
        }

        public async Task<int> GetStudyMinutesInRangeAsync(long userId, DateTime fromUtc, DateTime toUtc)
        {
            var sessions = await _db.StudySessions
                .Where(s => s.UserId == userId && s.EndedAt != null
                    && s.StartedAt != null
                    && s.EndedAt >= fromUtc && s.EndedAt < toUtc)
                .Select(s => new { s.StartedAt, s.EndedAt })
                .ToListAsync();

            double minutes = sessions.Sum(s => (s.EndedAt!.Value - s.StartedAt!.Value).TotalMinutes);
            return (int)Math.Round(minutes);
        }

        public async Task<int> GetFlipReviewsInRangeAsync(long userId, DateTime fromUtc, DateTime toUtc)
        {
            return await _db.FlipReviews
                .Where(f => f.Session.UserId == userId
                    && f.ReviewedAt >= fromUtc && f.ReviewedAt < toUtc)
                .CountAsync();
        }

        public async Task<int> GetTotalFlipReviewsAsync(long userId)
        {
            return await _db.FlipReviews
                .CountAsync(f => f.Session.UserId == userId);
        }

        public async Task<int> GetDocumentCountAsync(long userId)
        {
            return await _db.Documents.CountAsync(d => d.UserId == userId);
        }

        public async Task<List<Achievement>> GetAchievementsAsync()
        {
            return await _db.Achievements.OrderBy(a => a.Id).ToListAsync();
        }
    }
}
