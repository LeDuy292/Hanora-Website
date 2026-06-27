using BusinessObjects.Models;

namespace Repositories;

public interface IVocabularyRepository
{
    Task<Vocabulary?> GetByWordAsync(string word);
    Task<Vocabulary> CreateAsync(Vocabulary vocabulary);
    Task UpdateAsync(Vocabulary vocabulary);
    Task EnsureWordExistsAsync(string word);
    Task AddRelationAsync(long vocabId, long relatedId, RelationType type);
    Task<bool> SaveToNotebookAsync(long userId, long vocabId, long? documentId, int? pageNumber = null, string? personalNote = null);
    Task<List<UserVocabulary>> GetUserVocabularyAsync(long userId);
    Task<UserVocabulary?> GetUserVocabularyByIdsAsync(long userId, long vocabularyId);
    Task UpdateUserVocabularyAsync(UserVocabulary userVocabulary);
}
