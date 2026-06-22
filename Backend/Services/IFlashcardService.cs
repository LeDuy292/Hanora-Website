using BusinessObjects.Models;

namespace Services;

public interface IFlashcardService
{
    Task<List<object>> GetUserFlashcardsAsync(long userId);
    Task<bool> UpdateStatusAsync(long userId, string word, string status, int masteryLevel);
}
