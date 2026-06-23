using BusinessObjects.Models;
using Microsoft.Extensions.Logging;
using Repositories;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;

namespace Services;

public class VocabularyService : IVocabularyService
{
    private readonly IVocabularyRepository _vocabularyRepo;
    private readonly IDictionaryAiService _aiService;
    private readonly ILogger<VocabularyService> _logger;
    private readonly IBackgroundTaskQueue _taskQueue;

    public VocabularyService(IVocabularyRepository vocabularyRepo, IDictionaryAiService aiService, ILogger<VocabularyService> logger, IBackgroundTaskQueue taskQueue)
    {
        _vocabularyRepo = vocabularyRepo;
        _aiService = aiService;
        _logger = logger;
        _taskQueue = taskQueue;
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
                _ = ProcessRelationsAndExamplesBackgroundAsync(vocab.Word);
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

        _ = ProcessRelationsAndExamplesBackgroundAsync(vocab.Word);
        return vocab;
    }

    private async Task ProcessRelationsAndExamplesBackgroundAsync(string word)
    {
        await _taskQueue.QueueBackgroundWorkItemAsync(async (serviceProvider, token) =>
        {
            using var scope = serviceProvider.CreateScope();
            var vocabRepo = scope.ServiceProvider.GetRequiredService<IVocabularyRepository>();
            var aiService = scope.ServiceProvider.GetRequiredService<IDictionaryAiService>();
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<VocabularyService>>();

            try
            {
                var vocab = await vocabRepo.GetByWordAsync(word);
                if (vocab == null) return;

                // Process Examples
                if (!vocab.ExampleSentencesNavigation.Any())
                {
                    // Fallback if no examples exist at all
                    var aiInfo = await aiService.GetVocabularyInfoAsync(vocab.Word);
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
                        await vocabRepo.UpdateAsync(vocab);
                    }
                }
                else
                {
                    var needsTranslation = vocab.ExampleSentencesNavigation.Where(e => e.ViText == null && e.EnText != null).ToList();
                    if (needsTranslation.Any())
                    {
                        var englishSentences = needsTranslation.Select(e => e.EnText!).ToList();
                        var translations = await aiService.TranslateSentencesAsync(englishSentences);
                        
                        if (translations != null && translations.Count == englishSentences.Count)
                        {
                            for (int i = 0; i < needsTranslation.Count; i++)
                            {
                                needsTranslation[i].ViText = translations[i];
                            }
                            await vocabRepo.UpdateAsync(vocab);
                        }
                    }
                }

                // Process Relations
                if (!vocab.WordRelationVocabs.Any())
                {
                    var relations = await aiService.GetRelationsAsync(vocab.Word);
                    if (relations != null)
                    {
                        await LinkRelationsInScopeAsync(vocab.Id, relations.Synonyms, RelationType.Synonym, vocabRepo);
                        await LinkRelationsInScopeAsync(vocab.Id, relations.Antonyms, RelationType.Antonym, vocabRepo);
                        await LinkRelationsInScopeAsync(vocab.Id, relations.Compounds, RelationType.Compound, vocabRepo);
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to process background relations and examples for {Word}", word);
            }
        });
    }

    private async Task LinkRelationsInScopeAsync(long vocabId, List<string>? words, RelationType type, IVocabularyRepository vocabRepo)
    {
        if (words == null || !words.Any()) return;
        
        foreach (var word in words.Take(5))
        {
            if (string.IsNullOrWhiteSpace(word)) continue;
            
            await vocabRepo.EnsureWordExistsAsync(word);
            var relatedVocab = await vocabRepo.GetByWordAsync(word);
            if (relatedVocab != null)
            {
                await vocabRepo.AddRelationAsync(vocabId, relatedVocab.Id, type);
            }
        }
    }

    public async Task<bool> SaveToNotebookAsync(long userId, string word, long? documentId)
    {
        var vocab = await LookupWordAsync(word);
        if (vocab == null) return false;

        await _vocabularyRepo.SaveToNotebookAsync(userId, vocab.Id, documentId);
        return true;
    }

    public async Task<List<UserVocabulary>> GetUserVocabularyAsync(long userId)
    {
        return await _vocabularyRepo.GetUserVocabularyAsync(userId);
    }
}
