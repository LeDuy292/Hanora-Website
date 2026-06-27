using BusinessObjects.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Services;

public interface IFlashcardService
{
    Task<List<object>> GetUserFlashcardsAsync(long userId, long? deckId = null);
    Task<bool> UpdateStatusAsync(long userId, string word, string status, int masteryLevel);
    
    // Custom Decks
    Task<List<object>> GetUserDecksAsync(long userId);
    Task<FlashcardDeck> CreateDeckAsync(long userId, string name, string? source, long? documentId);
    Task<bool> BulkAddCardsAsync(long userId, BulkAddCardsRequest request);
    Task CompleteSessionAsync(long userId, long? deckId, int cardsStudied, int knowCount, bool completedDeck, bool completedWithoutInterruption);
}

public class BulkAddCardsRequest
{
    public long? DeckId { get; set; }
    public string? NewDeckName { get; set; }
    public string? Source { get; set; }
    public long? DocumentId { get; set; }
    public List<string> Words { get; set; } = new();
}
