using BusinessObjects.Models;

namespace Services;

public interface IVocabularyService
{
    Task<Vocabulary?> LookupWordAsync(string word);
    Task<VocabularySaveResult> SaveToNotebookAsync(long userId, string word, long? documentId, string? customDefinition = null, string? pinyin = null, string? hanViet = null, string? wordType = null, int? pageNumber = null, string? personalNote = null);
    Task<List<UserVocabulary>> GetUserVocabularyAsync(long userId);
    Task<VocabularyDeleteResult> DeleteFromNotebookAsync(long userId, IReadOnlyCollection<long> userVocabularyIds, bool deleteFlashcards = false);
    Task<SentenceAnalysisResponse?> AnalyzeSentenceAsync(string sentence);
    Task<SentenceComparisonResponse?> CompareSentencesAsync(string originalText, string modifiedText);
    Task<string> AskAiAssistantAsync(string word, string question, string contextSentence);
    Task<bool> ReportTranslationErrorAsync(long userId, string word, string currentTranslation, string proposedTranslation, string? notes = null);
}

public class VocabularySaveResult
{
    public bool Success { get; set; }
    public bool Created { get; set; }
    public bool Restored { get; set; }
    public bool AlreadyExists { get; set; }
    public long UserVocabularyId { get; set; }
    public string Message { get; set; } = string.Empty;
}
public class VocabularyDeleteResult
{
    public bool Success { get; set; }
    public int DeletedCount { get; set; }
    public int FlashcardsAffected { get; set; }
    public List<long> NotFoundIds { get; set; } = new();
}
