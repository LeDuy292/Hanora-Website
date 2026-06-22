using BusinessObjects.Models;
using Repositories;
using System.Text.Json;

namespace Services;

public class FlashcardService : IFlashcardService
{
    private readonly IFlashcardRepository _flashcardRepo;
    private readonly IVocabularyRepository _vocabRepo;

    public FlashcardService(IFlashcardRepository flashcardRepo, IVocabularyRepository vocabRepo)
    {
        _flashcardRepo = flashcardRepo;
        _vocabRepo = vocabRepo;
    }

    public async Task<List<object>> GetUserFlashcardsAsync(long userId)
    {
        var userVocabs = await _flashcardRepo.GetFlashcardsByUserIdAsync(userId);
        
        return userVocabs.Select(uv => {
            string translation = "No meaning";
            try {
                var doc = JsonDocument.Parse(uv.Vocabulary.Definitions);
                translation = doc.RootElement[0].GetProperty("meaning").GetString() ?? "Unknown";
            } catch { }

            return (object)new {
                id = uv.Id,
                text = uv.Vocabulary.Word,
                pinyin = uv.Vocabulary.Pinyin,
                translation = translation,
                wordType = uv.Vocabulary.WordType?.ToString() ?? "Other",
                srsLevel = uv.MasteryLevel,
                nextReviewDate = uv.LastReviewed?.AddDays(uv.MasteryLevel > 0 ? uv.MasteryLevel * 2 : 1).ToString("yyyy-MM-dd") ?? DateTime.Now.ToString("yyyy-MM-dd"),
                isFavorite = false,
                examples = uv.Vocabulary.ExampleSentencesNavigation.Select(e => new {
                    zhText = e.ZhText,
                    viText = e.ViText,
                    pinyin = "" 
                }).ToList()
            };
        }).ToList();
    }

    public async Task<bool> UpdateStatusAsync(long userId, string word, string status, int masteryLevel)
    {
        var vocab = await _vocabRepo.GetByWordAsync(word);
        if (vocab == null) return false;

        var uv = await _flashcardRepo.GetUserVocabularyByIdsAsync(userId, vocab.Id);
        if (uv == null)
        {
            await _vocabRepo.SaveToNotebookAsync(userId, vocab.Id, null);
            uv = await _flashcardRepo.GetUserVocabularyByIdsAsync(userId, vocab.Id);
            if (uv == null) return false;
        }

        uv.MasteryLevel = masteryLevel;
        uv.IsMastered = status == "mastered";
        uv.LastReviewed = DateTime.UtcNow;

        if (uv.Flashcard == null)
        {
            uv.Flashcard = new Flashcard
            {
                UserVocabularyId = uv.Id,
                LearnStatus = status,
                CreatedAt = DateTime.UtcNow,
                LastStudiedAt = DateTime.UtcNow,
                FlipStatus = "active"
            };
        }
        else
        {
            uv.Flashcard.LearnStatus = status;
            uv.Flashcard.LastStudiedAt = DateTime.UtcNow;
        }

        await _flashcardRepo.UpdateUserVocabularyAsync(uv);
        return true;
    }
}
