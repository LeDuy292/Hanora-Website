using BusinessObjects.Models;
using Repositories;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace Services;

public class FlashcardService : IFlashcardService
{
    private readonly IFlashcardRepository _flashcardRepo;
    private readonly IVocabularyRepository _vocabRepo;
    private readonly DataAccessObjects.AppDbContext _db;
    private readonly IStatsService _statsService;

    public FlashcardService(
        IFlashcardRepository flashcardRepo,
        IVocabularyRepository vocabRepo,
        DataAccessObjects.AppDbContext db,
        IStatsService statsService)
    {
        _flashcardRepo = flashcardRepo;
        _vocabRepo = vocabRepo;
        _db = db;
        _statsService = statsService;
    }

    public async Task<List<object>> GetUserFlashcardsAsync(long userId, long? deckId = null)
    {
        IQueryable<Flashcard> query = _db.Flashcards
            .Include(f => f.UserVocabulary)
                .ThenInclude(uv => uv.Vocabulary)
                    .ThenInclude(v => v.ExampleSentencesNavigation)
            .Include(f => f.UserVocabulary.SourceDocument)
            .Where(f => f.UserVocabulary.UserId == userId);

        if (deckId.HasValue)
        {
            query = query.Where(f => f.DeckId == deckId.Value);
        }

        var flashcards = await query.ToListAsync();

        return flashcards.Select(f => {
            string translation = "No meaning";
            try {
                var doc = JsonDocument.Parse(f.UserVocabulary.Vocabulary.Definitions);
                translation = doc.RootElement[0].GetProperty("meaning").GetString() ?? "Unknown";
            } catch { }

            return (object)new {
                id = f.Id,
                userVocabularyId = f.UserVocabularyId,
                deckId = f.DeckId,
                text = f.UserVocabulary.Vocabulary.Word,
                pinyin = f.UserVocabulary.Vocabulary.Pinyin,
                translation = translation,
                wordType = f.UserVocabulary.Vocabulary.WordType?.ToString() ?? "Other",
                srsLevel = f.UserVocabulary.MasteryLevel,
                nextReviewDate = f.UserVocabulary.LastReviewed?.AddDays(f.UserVocabulary.MasteryLevel > 0 ? f.UserVocabulary.MasteryLevel * 2 : 1).ToString("yyyy-MM-dd") ?? DateTime.Now.ToString("yyyy-MM-dd"),
                isFavorite = false,
                documentTitle = f.UserVocabulary.SourceDocument?.Title,
                examples = f.UserVocabulary.Vocabulary.ExampleSentencesNavigation.Select(e => new {
                    zhText = e.ZhText,
                    viText = e.ViText,
                    pinyin = "" 
                }).ToList()
            };
        }).ToList<object>();
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

        var flashcard = await _db.Flashcards.FirstOrDefaultAsync(f => f.UserVocabularyId == uv.Id);
        if (flashcard == null)
        {
            flashcard = new Flashcard
            {
                UserVocabularyId = uv.Id,
                LearnStatus = status,
                CreatedAt = DateTime.UtcNow,
                LastStudiedAt = DateTime.UtcNow,
                FlipStatus = "active"
            };
            _db.Flashcards.Add(flashcard);
        }
        else
        {
            flashcard.LearnStatus = status;
            flashcard.LastStudiedAt = DateTime.UtcNow;
            _db.Flashcards.Update(flashcard);
        }

        await _db.SaveChangesAsync();
        await _flashcardRepo.UpdateUserVocabularyAsync(uv);

        // Award +10 XP for SRS reviews
        await _statsService.AwardXpAsync(userId, 10, "Ôn tập SRS");

        // Track flashcard flips (+1 flipped review count)
        await _statsService.TrackFlashcardSessionAsync(userId, 1, status == "mastered" ? 1 : 0);

        return true;
    }

    public async Task<List<object>> GetUserDecksAsync(long userId)
    {
        var decks = await _db.FlashcardDecks
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new {
                id = d.Id,
                name = d.Name,
                source = d.Source,
                documentId = d.DocumentId,
                cardCount = d.Flashcards.Count,
                createdAt = d.CreatedAt
            })
            .ToListAsync();

        return decks.Cast<object>().ToList();
    }

    public async Task<FlashcardDeck> CreateDeckAsync(long userId, string name, string? source, long? documentId)
    {
        var deck = new FlashcardDeck
        {
            UserId = userId,
            Name = name,
            Source = source,
            DocumentId = documentId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.FlashcardDecks.Add(deck);
        await _db.SaveChangesAsync();
        return deck;
    }

    public async Task<bool> BulkAddCardsAsync(long userId, BulkAddCardsRequest request)
    {
        long deckId = 0;

        if (request.DeckId.HasValue)
        {
            deckId = request.DeckId.Value;
        }
        else if (!string.IsNullOrWhiteSpace(request.NewDeckName))
        {
            var newDeck = await CreateDeckAsync(userId, request.NewDeckName, request.Source, request.DocumentId);
            deckId = newDeck.Id;
        }
        else
        {
            throw new ArgumentException("Either DeckId or NewDeckName must be provided.");
        }

        foreach (var word in request.Words)
        {
            if (string.IsNullOrWhiteSpace(word)) continue;

            var vocab = await _vocabRepo.GetByWordAsync(word);
            if (vocab == null)
            {
                vocab = new Vocabulary
                {
                    Word = word,
                    Pinyin = "",
                    Definitions = "[]",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await _vocabRepo.CreateAsync(vocab);
            }

            var uv = await _db.UserVocabularies.FirstOrDefaultAsync(x => x.UserId == userId && x.VocabularyId == vocab.Id);
            if (uv == null)
            {
                uv = new UserVocabulary
                {
                    UserId = userId,
                    VocabularyId = vocab.Id,
                    SourceDocumentId = request.DocumentId,
                    SavedAt = DateTime.UtcNow,
                    IsMastered = false,
                    MasteryLevel = 0,
                    CorrectCount = 0,
                    WrongCount = 0
                };
                _db.UserVocabularies.Add(uv);
                await _db.SaveChangesAsync();

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
            }

            var existingFlashcard = await _db.Flashcards.FirstOrDefaultAsync(f => f.UserVocabularyId == uv.Id && f.DeckId == deckId);
            if (existingFlashcard == null)
            {
                var flashcard = new Flashcard
                {
                    UserVocabularyId = uv.Id,
                    DeckId = deckId,
                    LearnStatus = "new",
                    FlipStatus = "active",
                    CreatedAt = DateTime.UtcNow,
                    LastStudiedAt = DateTime.UtcNow
                };
                _db.Flashcards.Add(flashcard);
                await _db.SaveChangesAsync();

                await _statsService.AwardXpAsync(userId, 5, "Thêm từ vào Flashcard");
            }
        }

        return true;
    }

    public async Task CompleteSessionAsync(long userId, long? deckId, int cardsStudied, int knowCount, bool completedDeck, bool completedWithoutInterruption)
    {
        if (cardsStudied <= 0) return;

        int xp = cardsStudied * 2;
        string reason = $"Học xong {cardsStudied} thẻ Flashcard";

        if (completedDeck)
        {
            xp += 20;
            reason += ", hoàn thành bộ (+20 XP)";
        }
        if (completedWithoutInterruption)
        {
            xp += 10;
            reason += ", không bỏ giữa chừng (+10 XP)";
        }

        await _statsService.AwardXpAsync(userId, xp, reason);
        await _statsService.TrackFlashcardSessionAsync(userId, cardsStudied, knowCount);
    }
}
