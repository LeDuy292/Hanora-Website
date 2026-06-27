using BusinessObjects.Models;
using Microsoft.Extensions.Logging;
using Repositories;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Services;

public class VocabularyService : IVocabularyService
{
    private readonly IVocabularyRepository _vocabularyRepo;
    private readonly IDictionaryAiService _aiService;
    private readonly ILogger<VocabularyService> _logger;
    private readonly IBackgroundTaskQueue _taskQueue;
    private readonly IStatsService _statsService;
    private readonly DataAccessObjects.AppDbContext _db;

    public VocabularyService(
        IVocabularyRepository vocabularyRepo,
        IDictionaryAiService aiService,
        ILogger<VocabularyService> logger,
        IBackgroundTaskQueue taskQueue,
        IStatsService statsService,
        DataAccessObjects.AppDbContext db)
    {
        _vocabularyRepo = vocabularyRepo;
        _aiService = aiService;
        _logger = logger;
        _taskQueue = taskQueue;
        _statsService = statsService;
        _db = db;
    }

    public async Task<Vocabulary?> LookupWordAsync(string word)
    {
        var vocab = await _vocabularyRepo.GetByWordAsync(word);
        bool needsAiUpdate = false;
        
        if (vocab != null)
        {
            bool isOldEnglishFormat = vocab.Definitions.Contains("\"lang\":\"en\"") || vocab.Definitions.Contains("\"lang\": \"en\"");
            bool isPlaceholder = string.IsNullOrWhiteSpace(vocab.Definitions) || vocab.Definitions == "[]";
            bool missingExamples = !vocab.ExampleSentencesNavigation.Any();
            
            if (isOldEnglishFormat || isPlaceholder || missingExamples)
            {
                needsAiUpdate = true;
                _logger.LogInformation("Word {Word} requires AI enrichment (isPlaceholder: {Placeholder}, missingExamples: {MissingExamples}, isOldEnglish: {OldEn})", 
                    word, isPlaceholder, missingExamples, isOldEnglishFormat);
            }
            else
            {
                _logger.LogInformation("Cache hit for word: {Word}", word);
                
                // Synchronously translate Tatoeba English examples if necessary before returning
                var pendingTranslations = vocab.ExampleSentencesNavigation.Where(e => e.ViText == null && e.EnText != null).ToList();
                if (pendingTranslations.Any())
                {
                    _logger.LogInformation("Synchronously translating {Count} examples for word {Word}", pendingTranslations.Count, word);
                    var englishSentences = pendingTranslations.Select(e => e.EnText!).ToList();
                    var translations = await _aiService.TranslateSentencesAsync(englishSentences);
                    
                    if (translations != null && translations.Count == englishSentences.Count)
                    {
                        for (int i = 0; i < pendingTranslations.Count; i++)
                        {
                            pendingTranslations[i].ViText = translations[i];
                        }
                        await _vocabularyRepo.UpdateAsync(vocab);
                    }
                }
                
                _ = ProcessRelationsAndExamplesBackgroundAsync(vocab.Word);
                return vocab;
            }
        }
        else
        {
            needsAiUpdate = true;
            _logger.LogInformation("Cache miss for word: {Word}. Falling back to AI.", word);
        }

        if (needsAiUpdate)
        {
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

                    HanViet = aiResponse.HanViet,
                    Collocations = aiResponse.Collocations != null ? JsonSerializer.Serialize(aiResponse.Collocations) : null,
                    GrammarPatterns = aiResponse.GrammarPatterns != null ? JsonSerializer.Serialize(aiResponse.GrammarPatterns) : null,
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

                vocab.HanViet = aiResponse.HanViet;
                vocab.Collocations = aiResponse.Collocations != null ? JsonSerializer.Serialize(aiResponse.Collocations) : null;
                vocab.GrammarPatterns = aiResponse.GrammarPatterns != null ? JsonSerializer.Serialize(aiResponse.GrammarPatterns) : null;
                vocab.UpdatedAt = DateTime.UtcNow;
                
                // Process examples synchronously if they were missing
                if (!vocab.ExampleSentencesNavigation.Any() && aiResponse.Examples.Any())
                {
                    foreach (var ex in aiResponse.Examples)
                    {
                        vocab.ExampleSentencesNavigation.Add(new ExampleSentence
                        {
                            ZhText = ex.ZhText,
                            ViText = ex.ViText,
                            Source = "AI Generated",
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }


                await _vocabularyRepo.UpdateAsync(vocab);
            }
        }

        // Still process relations in background
        _ = ProcessRelationsAndExamplesBackgroundAsync(vocab!.Word);
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

    public async Task<bool> SaveToNotebookAsync(
        long userId,
        string word,
        long? documentId,
        string? customDefinition = null,
        string? pinyin = null,
        string? hanViet = null,
        string? wordType = null,
        int? pageNumber = null,
        string? personalNote = null)
    {
        var vocab = await _vocabularyRepo.GetByWordAsync(word);
        if (vocab == null)
        {
            var defJson = !string.IsNullOrWhiteSpace(customDefinition)
                ? JsonSerializer.Serialize(new[] { new { lang = "vn", meaning = customDefinition } })
                : "[]";

            vocab = new Vocabulary
            {
                Word = word,
                Pinyin = pinyin ?? "",
                Definitions = defJson,
                HanViet = hanViet,
                WordType = Enum.TryParse<WordType>(wordType, true, out var wt) ? wt : null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _vocabularyRepo.CreateAsync(vocab);
        }
        else
        {
            bool updated = false;
            if (!string.IsNullOrWhiteSpace(customDefinition))
            {
                vocab.Definitions = JsonSerializer.Serialize(new[] { new { lang = "vn", meaning = customDefinition } });
                updated = true;
            }
            if (!string.IsNullOrWhiteSpace(pinyin))
            {
                vocab.Pinyin = pinyin;
                updated = true;
            }
            if (!string.IsNullOrWhiteSpace(hanViet))
            {
                vocab.HanViet = hanViet;
                updated = true;
            }
            if (!string.IsNullOrWhiteSpace(wordType) && Enum.TryParse<WordType>(wordType, true, out var wt))
            {
                vocab.WordType = wt;
                updated = true;
            }
            if (updated)
            {
                vocab.UpdatedAt = DateTime.UtcNow;
                await _vocabularyRepo.UpdateAsync(vocab);
            }
        }

        bool isNew = await _vocabularyRepo.SaveToNotebookAsync(userId, vocab.Id, documentId, pageNumber, personalNote);
        if (isNew)
        {
            var stats = await _db.UserStats.FirstOrDefaultAsync(s => s.UserId == userId);
            if (stats != null)
            {
                stats.TotalWordsSaved = (stats.TotalWordsSaved ?? 0) + 1;
                stats.UpdatedAt = DateTime.UtcNow;
                _db.UserStats.Update(stats);
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow + TimeSpan.FromHours(7));
            var progress = await _db.LearningProgresses
                .FirstOrDefaultAsync(p => p.UserId == userId && p.ActivityDate == today);
            if (progress != null)
            {
                progress.NewWordsSaved = (progress.NewWordsSaved ?? 0) + 1;
                progress.TotalWordsSaved = (progress.TotalWordsSaved ?? 0) + 1;
                _db.LearningProgresses.Update(progress);
            }
            await _db.SaveChangesAsync();

            await _statsService.AwardXpAsync(userId, 2, "Lưu từ mới vào Sổ tay");
        }

        return true;
    }

    public async Task<List<UserVocabulary>> GetUserVocabularyAsync(long userId)
    {
        return await _vocabularyRepo.GetUserVocabularyAsync(userId);
    }

    public async Task<SentenceAnalysisResponse?> AnalyzeSentenceAsync(string sentence)
    {
        return await _aiService.AnalyzeSentenceAsync(sentence);
    }

    public async Task<SentenceComparisonResponse?> CompareSentencesAsync(string originalText, string modifiedText)
    {
        return await _aiService.CompareSentencesAsync(originalText, modifiedText);
    }

    public async Task<string> AskAiAssistantAsync(string word, string question, string contextSentence)
    {
        return await _aiService.AskAiAssistantAsync(word, question, contextSentence);
    }
}
