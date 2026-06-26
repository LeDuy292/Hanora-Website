namespace Services;

public class ExampleDto
{
    public string ZhText { get; set; } = string.Empty;
    public string ViText { get; set; } = string.Empty;
}

public class VocabularyAiResponse
{
    public string Word { get; set; } = string.Empty;
    public string Pinyin { get; set; } = string.Empty;
    public string HanViet { get; set; } = string.Empty;
    public string Definitions { get; set; } = string.Empty;
    public string UsageNotes { get; set; } = string.Empty;
    public string WordType { get; set; } = "Other";
    public List<string> Collocations { get; set; } = new();
    public List<string> GrammarPatterns { get; set; } = new();
    public List<ExampleDto> Examples { get; set; } = new();
}

public class RelationsDto
{
    public List<string> Synonyms { get; set; } = new();
    public List<string> Antonyms { get; set; } = new();
    public List<string> Compounds { get; set; } = new();
}

public class SentenceAnalysisResponse
{
    public string OriginalText { get; set; } = string.Empty;
    public string Pinyin { get; set; } = string.Empty;
    public string HanViet { get; set; } = string.Empty;
    public string Vietnamese { get; set; } = string.Empty;
    public string GrammarAnalysis { get; set; } = string.Empty;
}

public class SentenceComparisonResponse
{
    public string OriginalText { get; set; } = string.Empty;
    public string OriginalTranslation { get; set; } = string.Empty;
    public string ModifiedText { get; set; } = string.Empty;
    public string ModifiedTranslation { get; set; } = string.Empty;
    public string Differences { get; set; } = string.Empty;
}

public interface IDictionaryAiService
{
    Task<VocabularyAiResponse?> GetVocabularyInfoAsync(string word);
    Task<List<string>?> TranslateSentencesAsync(List<string> englishSentences);
    Task<RelationsDto?> GetRelationsAsync(string word);
    Task<SentenceAnalysisResponse?> AnalyzeSentenceAsync(string sentence);
    Task<SentenceComparisonResponse?> CompareSentencesAsync(string originalText, string modifiedText);
    Task<string> AskAiAssistantAsync(string word, string question, string contextSentence);
}
