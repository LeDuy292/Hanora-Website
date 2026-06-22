using BusinessObjects.Models;

namespace Repositories;

public interface IFlashcardRepository
{
    Task<List<UserVocabulary>> GetFlashcardsByUserIdAsync(long userId);
    Task<UserVocabulary?> GetUserVocabularyByIdsAsync(long userId, long vocabularyId);
    Task UpdateFlashcardAsync(Flashcard flashcard);
    Task UpdateUserVocabularyAsync(UserVocabulary userVocabulary);
    Task<Flashcard?> GetFlashcardByUserVocabularyIdAsync(long userVocabularyId);
}
