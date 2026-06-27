using BusinessObjects.Models;
using DataAccessObjects;
using Microsoft.EntityFrameworkCore;

namespace Repositories;

public class VocabularyRepository : IVocabularyRepository
{
    private readonly AppDbContext _db;

    public VocabularyRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Vocabulary?> GetByWordAsync(string word)
    {
        return await _db.Vocabularies
            .Include(v => v.ExampleSentencesNavigation)
            .Include(v => v.WordRelationVocabs.Take(10))
            .ThenInclude(wr => wr.Related)
            .FirstOrDefaultAsync(v => v.Word == word);
    }

    public async Task<Vocabulary> CreateAsync(Vocabulary vocabulary)
    {
        _db.Vocabularies.Add(vocabulary);
        await _db.SaveChangesAsync();
        return vocabulary;
    }

    public async Task UpdateAsync(Vocabulary vocabulary)
    {
        _db.Vocabularies.Update(vocabulary);
        await _db.SaveChangesAsync();
    }

    public async Task EnsureWordExistsAsync(string word)
    {
        var sql = "INSERT INTO vocabulary (word, pinyin, definitions) VALUES (@p0, '', '[]'::jsonb) ON CONFLICT (word) DO NOTHING";
        await _db.Database.ExecuteSqlRawAsync(sql, word);
    }

    public async Task AddRelationAsync(long vocabId, long relatedId, RelationType type)
    {
        if (!await _db.WordRelations.AnyAsync(wr => wr.VocabId == vocabId && wr.RelatedId == relatedId && wr.RelationType == type))
        {
            _db.WordRelations.Add(new WordRelation
            {
                VocabId = vocabId,
                RelatedId = relatedId,
                RelationType = type,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
        }
    }

    public async Task<bool> SaveToNotebookAsync(long userId, long vocabId, long? documentId, int? pageNumber = null, string? personalNote = null)
    {
        var existing = await _db.UserVocabularies.FirstOrDefaultAsync(uv => uv.UserId == userId && uv.VocabularyId == vocabId);
        if (existing == null)
        {
            _db.UserVocabularies.Add(new UserVocabulary
            {
                UserId = userId,
                VocabularyId = vocabId,
                SourceDocumentId = documentId,
                SourcePage = pageNumber,
                PersonalNote = personalNote,
                SavedAt = DateTime.UtcNow,
                IsMastered = false
            });
            await _db.SaveChangesAsync();
            return true;
        }
        else
        {
            if (pageNumber.HasValue) existing.SourcePage = pageNumber;
            if (!string.IsNullOrEmpty(personalNote)) existing.PersonalNote = personalNote;
            if (documentId.HasValue) existing.SourceDocumentId = documentId;
            _db.UserVocabularies.Update(existing);
            await _db.SaveChangesAsync();
            return false;
        }
    }

    public async Task<List<UserVocabulary>> GetUserVocabularyAsync(long userId)
    {
        return await _db.UserVocabularies
            .Include(uv => uv.Vocabulary)
            .ThenInclude(v => v.ExampleSentencesNavigation)
            .Include(uv => uv.Flashcards)
            .Where(uv => uv.UserId == userId)
            .ToListAsync();
    }

    public async Task<UserVocabulary?> GetUserVocabularyByIdsAsync(long userId, long vocabularyId)
    {
        return await _db.UserVocabularies
            .Include(uv => uv.Flashcards)
            .FirstOrDefaultAsync(uv => uv.UserId == userId && uv.VocabularyId == vocabularyId);
    }
    public async Task UpdateUserVocabularyAsync(UserVocabulary userVocabulary)
    {
        _db.UserVocabularies.Update(userVocabulary);
        await _db.SaveChangesAsync();
    }
}
