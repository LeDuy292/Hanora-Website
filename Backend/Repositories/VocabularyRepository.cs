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

    public async Task SaveToNotebookAsync(long userId, long vocabId, long? documentId)
    {
        var existing = await _db.UserVocabularies.FirstOrDefaultAsync(uv => uv.UserId == userId && uv.VocabularyId == vocabId);
        if (existing == null)
        {
            _db.UserVocabularies.Add(new UserVocabulary
            {
                UserId = userId,
                VocabularyId = vocabId,
                SourceDocumentId = documentId,
                SavedAt = DateTime.UtcNow,
                IsMastered = false
            });
            await _db.SaveChangesAsync();
        }
    }
}
