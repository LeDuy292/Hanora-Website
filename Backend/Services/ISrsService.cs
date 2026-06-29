using BusinessObjects.Models;
using System.Threading.Tasks;

namespace Services;

public interface ISrsService
{
    /// <summary>
    /// Calculate the next review date based on SM-2 algorithm variant
    /// </summary>
    DateTime CalculateNextReviewDate(int masteryLevel, DateTime lastReviewed, FlipResult result);

    /// <summary>
    /// Update mastery level based on review result
    /// </summary>
    int UpdateMasteryLevel(int currentLevel, FlipResult result);

    /// <summary>
    /// Get flashcards due for review
    /// </summary>
    Task<List<long>> GetDueFlashcardIdsAsync(long userId, long? deckId = null);

    /// <summary>
    /// Process a flashcard review and update SRS data
    /// </summary>
    Task ProcessReviewAsync(long flashcardId, FlipResult result, int responseMs);
}
