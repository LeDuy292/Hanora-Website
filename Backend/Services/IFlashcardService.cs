using BusinessObjects.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Services;

public interface IFlashcardService
{
    Task<List<object>> GetUserFlashcardsAsync(long userId, long? deckId = null);
    Task<bool> UpdateStatusAsync(long userId, string word, string status, int masteryLevel);
    
    // Custom Decks
    Task<List<object>> GetUserDecksAsync(long userId, string? search = null, string? filter = null, string? sort = null);
    Task<FlashcardDeck> CreateDeckAsync(long userId, string name, string? source, long? documentId);
    Task<bool> BulkAddCardsAsync(long userId, BulkAddCardsRequest request);
    Task CompleteSessionAsync(long userId, long? deckId, int cardsStudied, int knowCount, bool completedDeck, bool completedWithoutInterruption);
    Task<bool> DeleteDeckAsync(long userId, long deckId);
    Task<bool> UpdateDeckAsync(long userId, long deckId, string name, string? description);
    Task<bool> RemoveCardFromDeckAsync(long userId, long cardId);
    Task<bool> CreateFlashcardSetAsync(long userId, CreateFlashcardSetRequest request);
    Task<FlashcardDeck?> DuplicateDeckAsync(long userId, long deckId);
    Task<object> GetDashboardStatsAsync(long userId);

    // Review Mode (SRS-based)
    Task<List<object>> GetReviewCardsAsync(long userId, long? deckId = null);
    Task<bool> SubmitReviewAsync(long userId, long flashcardId, FlipResult result, int responseMs);

    // Write Mode
    Task<List<object>> GetWriteModeCardsAsync(long userId, long? deckId = null, int count = 10);
    Task<bool> SubmitWriteAnswerAsync(long userId, long flashcardId, string userAnswer);

    // Match Mode
    Task<object> StartMatchGameAsync(long userId, long? deckId = null, int cardCount = 8);
    Task<bool> SubmitMatchPairAsync(long userId, long matchGameId, long flashcardId1, long flashcardId2);
    Task<bool> CompleteMatchGameAsync(long userId, long matchGameId);
}

public class BulkAddCardsRequest
{
    public long? DeckId { get; set; }
    public string? NewDeckName { get; set; }
    public string? Source { get; set; }
    public long? DocumentId { get; set; }
    public List<string> Words { get; set; } = new();
}

public class CreateFlashcardSetRequest
{
    public string FlashcardName { get; set; } = null!;
    public string? Description { get; set; }
    public long? DocumentId { get; set; }
    public List<string> ListVocabularyIds { get; set; } = new();
}
