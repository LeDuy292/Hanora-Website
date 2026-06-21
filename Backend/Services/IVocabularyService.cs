using BusinessObjects.Models;

namespace Services;

public interface IVocabularyService
{
    Task<Vocabulary?> LookupWordAsync(string word);
}
