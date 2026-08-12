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

    // Learn Mode (Quizlet-style)
    Task<LearnSessionResponse> StartLearnSessionAsync(long userId, long? deckId, bool learnAgainOnly);
    Task<LearnQuestionDto?> GetNextLearnQuestionAsync(long userId, long sessionId, long? deckId, bool learnAgainOnly);
    Task<SubmitLearnAnswerResponse> SubmitLearnAnswerAsync(long userId, SubmitLearnAnswerRequest request);
    Task<LearnSessionSummaryResponse> FinishLearnSessionAsync(long userId, long sessionId);
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

public class StartLearnRequest
{
    public long? DeckId { get; set; }
    public bool LearnAgainOnly { get; set; }
}

public class LearnSessionResponse
{
    public long SessionId { get; set; }
    public int TotalQuestions { get; set; }
}

public class LearnQuestionDto
{
    public long FlashcardId { get; set; }
    public string Type { get; set; } = null!;
    public string QuestionText { get; set; } = null!;
    public string CorrectAnswer { get; set; } = null!;
    public List<string> Options { get; set; } = new();
    public string Word { get; set; } = null!;
    public string Pinyin { get; set; } = null!;
    public string Translation { get; set; } = null!;
    public string? HanViet { get; set; }
    public string? WordType { get; set; }
    public string? Explanation { get; set; }
    public string? ExampleZh { get; set; }
    public string? ExampleVi { get; set; }
}

public class SubmitLearnAnswerRequest
{
    public long SessionId { get; set; }
    public long FlashcardId { get; set; }
    public string UserAnswer { get; set; } = null!;
    public int ResponseMs { get; set; }
    public string QuestionType { get; set; } = null!;
}

public class SubmitLearnAnswerResponse
{
    public bool IsCorrect { get; set; }
    public string CorrectAnswer { get; set; } = null!;
    public int XpEarned { get; set; }
    public int NewMasteryLevel { get; set; }
    public string? NextReviewDate { get; set; }
}

public class LearnSessionSummaryResponse
{
    public int TotalCards { get; set; }
    public int CorrectCount { get; set; }
    public int IncorrectCount { get; set; }
    public decimal AccuracyPercent { get; set; }
    public int XpEarned { get; set; }
    public List<FailedCardDto> FailedCards { get; set; } = new();
}

public class FailedCardDto
{
    public string Word { get; set; } = null!;
    public string Pinyin { get; set; } = null!;
    public string Translation { get; set; } = null!;
    public int WrongCount { get; set; }
}
