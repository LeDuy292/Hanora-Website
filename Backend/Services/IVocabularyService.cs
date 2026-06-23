using BusinessObjects.Models;

namespace Services;

public interface IVocabularyService
{
    Task<Vocabulary?> LookupWordAsync(string word);
    Task<bool> SaveToNotebookAsync(long userId, string word, long? documentId);
    Task<List<UserVocabulary>> GetUserVocabularyAsync(long userId);
}
