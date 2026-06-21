using BusinessObjects.Models;

namespace Repositories;

public interface IVocabularyRepository
{
    Task<Vocabulary?> GetByWordAsync(string word);
    Task<Vocabulary> CreateAsync(Vocabulary vocabulary);
    Task UpdateAsync(Vocabulary vocabulary);
    Task EnsureWordExistsAsync(string word);
    Task AddRelationAsync(long vocabId, long relatedId, RelationType type);
}
