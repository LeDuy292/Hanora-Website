using BusinessObjects.Models;
using Microsoft.Extensions.Logging;
using Repositories;
using System.Text.Json;

namespace Services;

public class VocabularyService : IVocabularyService
{
    private readonly IVocabularyRepository _vocabularyRepo;
    private readonly IDictionaryAiService _aiService;
    private readonly ILogger<VocabularyService> _logger;

    public VocabularyService(IVocabularyRepository vocabularyRepo, IDictionaryAiService aiService, ILogger<VocabularyService> logger)
    {
        _vocabularyRepo = vocabularyRepo;
        _aiService = aiService;
        _logger = logger;
    }

    public async Task<Vocabulary?> LookupWordAsync(string word)
    {
        var vocab = await _vocabularyRepo.GetByWordAsync(word);
        if (vocab != null)
        {
            bool isOldEnglishFormat = vocab.Definitions.Contains("\"lang\":\"en\"") || vocab.Definitions.Contains("\"lang\": \"en\"");
            if (!isOldEnglishFormat)
            {
                _logger.LogInformation("Cache hit for word: {Word}", word);
                await ProcessRelationsAndExamplesAsync(vocab);
                return vocab;
            }
            else
            {
                _logger.LogInformation("Found word {Word} but it is in English format. Translating via AI...", word);
            }
        }
        else
        {
            _logger.LogInformation("Cache miss for word: {Word}. Falling back to AI.", word);
        }

        var aiResponse = await _aiService.GetVocabularyInfoAsync(word);
        if (aiResponse == null) return vocab;

        var newDefinitionsJson = JsonSerializer.Serialize(new[] { new { lang = "vn", meaning = aiResponse.Definitions } });

        if (vocab == null)
        {
            vocab = new Vocabulary
            {
                Word = aiResponse.Word,
                Pinyin = aiResponse.Pinyin,
                Definitions = newDefinitionsJson,
                UsageNotes = aiResponse.UsageNotes,
                WordType = Enum.TryParse<WordType>(aiResponse.WordType, true, out var type) ? type : null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                ExampleSentencesNavigation = aiResponse.Examples.Select(e => new ExampleSentence
                {
                    ZhText = e.ZhText,
                    ViText = e.ViText,
                    Source = "AI Generated",
                    CreatedAt = DateTime.UtcNow
                }).ToList()
            };

            await _vocabularyRepo.CreateAsync(vocab);
        }
        else
        {
            vocab.Pinyin = aiResponse.Pinyin;
            vocab.Definitions = newDefinitionsJson;
            vocab.UsageNotes = aiResponse.UsageNotes;
            vocab.WordType = Enum.TryParse<WordType>(aiResponse.WordType, true, out var type) ? type : null;
            vocab.UpdatedAt = DateTime.UtcNow;

            await _vocabularyRepo.UpdateAsync(vocab);
        }

        await ProcessRelationsAndExamplesAsync(vocab);
        return vocab;
    }

    private async Task ProcessRelationsAndExamplesAsync(Vocabulary vocab)
    {
        // Process Examples
        if (!vocab.ExampleSentencesNavigation.Any())
        {
            // Fallback if no examples exist at all
            var aiInfo = await _aiService.GetVocabularyInfoAsync(vocab.Word);
            if (aiInfo != null && aiInfo.Examples.Any())
            {
                foreach (var ex in aiInfo.Examples)
                {
                    vocab.ExampleSentencesNavigation.Add(new ExampleSentence
                    {
                        ZhText = ex.ZhText,
                        ViText = ex.ViText,
                        Source = "AI Generated",
                        CreatedAt = DateTime.UtcNow
                    });
                }
                await _vocabularyRepo.UpdateAsync(vocab);
            }
        }
        else
        {
            var needsTranslation = vocab.ExampleSentencesNavigation.Where(e => e.ViText == null && e.EnText != null).ToList();
            if (needsTranslation.Any())
            {
                var englishSentences = needsTranslation.Select(e => e.EnText!).ToList();
                var translations = await _aiService.TranslateSentencesAsync(englishSentences);
                
                if (translations != null && translations.Count == englishSentences.Count)
                {
                    for (int i = 0; i < needsTranslation.Count; i++)
                    {
                        needsTranslation[i].ViText = translations[i];
                    }
                    await _vocabularyRepo.UpdateAsync(vocab);
                }
            }
        }

        // Process Relations
        if (!vocab.WordRelationVocabs.Any())
        {
            var relations = await _aiService.GetRelationsAsync(vocab.Word);
            if (relations != null)
            {
                await LinkRelationsAsync(vocab.Id, relations.Synonyms, RelationType.Synonym);
                await LinkRelationsAsync(vocab.Id, relations.Antonyms, RelationType.Antonym);
                await LinkRelationsAsync(vocab.Id, relations.Compounds, RelationType.Compound);
                
                // Re-fetch to populate the navigation properties for the response
                var updatedVocab = await _vocabularyRepo.GetByWordAsync(vocab.Word);
                if (updatedVocab != null)
                {
                    vocab.WordRelationVocabs = updatedVocab.WordRelationVocabs;
                }
            }
        }
    }

    private async Task LinkRelationsAsync(long vocabId, List<string>? words, RelationType type)
    {
        if (words == null || !words.Any()) return;
        
        foreach (var word in words.Take(5))
        {
            if (string.IsNullOrWhiteSpace(word)) continue;
            
            await _vocabularyRepo.EnsureWordExistsAsync(word);
            var relatedVocab = await _vocabularyRepo.GetByWordAsync(word);
            if (relatedVocab != null)
            {
                await _vocabularyRepo.AddRelationAsync(vocabId, relatedVocab.Id, type);
            }
        }
    }
}
