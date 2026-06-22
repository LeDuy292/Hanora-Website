using BusinessObjects.Models;
using DataAccessObjects;
using Microsoft.EntityFrameworkCore;

namespace Repositories;

public class FlashcardRepository : IFlashcardRepository
{
    private readonly AppDbContext _db;

    public FlashcardRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<UserVocabulary>> GetFlashcardsByUserIdAsync(long userId)
    {
        return await _db.UserVocabularies
            .Include(uv => uv.Vocabulary)
                .ThenInclude(v => v.ExampleSentencesNavigation)
            .Include(uv => uv.Flashcard)
            .Where(uv => uv.UserId == userId)
            .ToListAsync();
    }

    public async Task<UserVocabulary?> GetUserVocabularyByIdsAsync(long userId, long vocabularyId)
    {
        return await _db.UserVocabularies
            .Include(uv => uv.Flashcard)
            .FirstOrDefaultAsync(uv => uv.UserId == userId && uv.VocabularyId == vocabularyId);
    }

    public async Task UpdateFlashcardAsync(Flashcard flashcard)
    {
        _db.Flashcards.Update(flashcard);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateUserVocabularyAsync(UserVocabulary userVocabulary)
    {
        _db.UserVocabularies.Update(userVocabulary);
        await _db.SaveChangesAsync();
    }

    public async Task<Flashcard?> GetFlashcardByUserVocabularyIdAsync(long userVocabularyId)
    {
        return await _db.Flashcards.FirstOrDefaultAsync(f => f.UserVocabularyId == userVocabularyId);
    }
}
