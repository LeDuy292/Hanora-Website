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
    public string Definitions { get; set; } = string.Empty;
    public string UsageNotes { get; set; } = string.Empty;
    public string WordType { get; set; } = "Other";
    public List<ExampleDto> Examples { get; set; } = new();
}

public class RelationsDto
{
    public List<string> Synonyms { get; set; } = new();
    public List<string> Antonyms { get; set; } = new();
    public List<string> Compounds { get; set; } = new();
}

public interface IDictionaryAiService
{
    Task<VocabularyAiResponse?> GetVocabularyInfoAsync(string word);
    Task<List<string>?> TranslateSentencesAsync(List<string> englishSentences);
    Task<RelationsDto?> GetRelationsAsync(string word);
}
