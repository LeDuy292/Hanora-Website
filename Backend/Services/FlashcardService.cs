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
    private readonly ISrsService _srsService;

    public FlashcardService(
        IFlashcardRepository flashcardRepo,
        IVocabularyRepository vocabRepo,
        DataAccessObjects.AppDbContext db,
        IStatsService statsService,
        ISrsService srsService)
    {
        _flashcardRepo = flashcardRepo;
        _vocabRepo = vocabRepo;
        _db = db;
        _statsService = statsService;
        _srsService = srsService;
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
            string translation = CleanTranslation(f.UserVocabulary.Vocabulary.Definitions);

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
                hanViet = f.UserVocabulary.Vocabulary.HanViet,
                collocations = f.UserVocabulary.Vocabulary.Collocations,
                grammarPatterns = f.UserVocabulary.Vocabulary.GrammarPatterns,
                context = f.UserVocabulary.Vocabulary.UsageNotes,
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

    public async Task<List<object>> GetUserDecksAsync(long userId, string? search = null, string? filter = null, string? sort = null)
    {
        var query = _db.FlashcardDecks
            .Include(d => d.Flashcards)
            .Where(d => d.UserId == userId);

        // Search
        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(d =>
                d.Name.ToLower().Contains(search.ToLower()) ||
                (d.Description != null && d.Description.ToLower().Contains(search.ToLower())) ||
                (d.Source != null && d.Source.ToLower().Contains(search.ToLower())));
        }

        // Filter
        if (!string.IsNullOrWhiteSpace(filter))
        {
            switch (filter.ToLower())
            {
                case "learning":
                    query = query.Where(d => d.Flashcards.Any(f => f.LearnStatus != "mastered" && f.LearnStatus != "new"));
                    break;
                case "not_started":
                    query = query.Where(d => d.Flashcards.All(f => f.LearnStatus == "new"));
                    break;
                case "completed":
                    query = query.Where(d => d.Flashcards.Count > 0 && d.Flashcards.All(f => f.LearnStatus == "mastered"));
                    break;
                case "recently_created":
                    query = query.Where(d => d.CreatedAt >= DateTime.UtcNow.AddDays(-7));
                    break;
                case "recently_studied":
                    query = query.Where(d => d.Flashcards.Any(f => f.LastStudiedAt >= DateTime.UtcNow.AddDays(-7)));
                    break;
            }
        }

        // Sort
        if (!string.IsNullOrWhiteSpace(sort))
        {
            switch (sort.ToLower())
            {
                case "created_desc":
                    query = query.OrderByDescending(d => d.CreatedAt);
                    break;
                case "created_asc":
                    query = query.OrderBy(d => d.CreatedAt);
                    break;
                case "name_asc":
                    query = query.OrderBy(d => d.Name);
                    break;
                case "name_desc":
                    query = query.OrderByDescending(d => d.Name);
                    break;
                case "progress":
                    query = query.OrderByDescending(d => d.Flashcards.Count > 0
                        ? (double)d.Flashcards.Count(f => f.LearnStatus == "mastered") / d.Flashcards.Count
                        : 0);
                    break;
                case "word_count":
                    query = query.OrderByDescending(d => d.Flashcards.Count);
                    break;
                case "last_studied":
                    query = query.OrderByDescending(d => d.Flashcards.Count > 0 ? d.Flashcards.Max(f => f.LastStudiedAt) : (DateTime?)null);
                    break;
                default:
                    query = query.OrderByDescending(d => d.CreatedAt);
                    break;
            }
        }
        else
        {
            query = query.OrderByDescending(d => d.CreatedAt);
        }

        var decks = await query
            .Select(d => new {
                id = d.Id,
                name = d.Name,
                description = d.Description,
                source = d.Source,
                documentId = d.DocumentId,
                totalWords = d.Flashcards.Count,
                masteredWords = d.Flashcards.Count(f => f.LearnStatus == "mastered"),
                learnedWords = d.Flashcards.Count(f => f.LearnStatus != "new"),
                createdAt = d.CreatedAt,
                lastStudiedAt = d.Flashcards.Count > 0 ? d.Flashcards.Max(f => f.LastStudiedAt) : d.CreatedAt
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
            UpdatedAt = DateTime.UtcNow,
            Description = null
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

    public async Task<bool> DeleteDeckAsync(long userId, long deckId)
    {
        var deck = await _db.FlashcardDecks
            .FirstOrDefaultAsync(d => d.Id == deckId && d.UserId == userId);
        if (deck == null) return false;

        _db.FlashcardDecks.Remove(deck);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateDeckAsync(long userId, long deckId, string name, string? description)
    {
        var deck = await _db.FlashcardDecks
            .FirstOrDefaultAsync(d => d.Id == deckId && d.UserId == userId);
        if (deck == null) return false;

        deck.Name = name;
        deck.Description = description;
        deck.UpdatedAt = DateTime.UtcNow;
        
        _db.FlashcardDecks.Update(deck);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveCardFromDeckAsync(long userId, long cardId)
    {
        var flashcard = await _db.Flashcards
            .Include(f => f.UserVocabulary)
            .FirstOrDefaultAsync(f => f.Id == cardId && f.UserVocabulary.UserId == userId);
        if (flashcard == null) return false;

        _db.Flashcards.Remove(flashcard);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CreateFlashcardSetAsync(long userId, CreateFlashcardSetRequest request)
    {
        if (request.ListVocabularyIds == null || request.ListVocabularyIds.Count < 1)
        {
            return false;
        }

        string source = "Tự học";
        if (request.DocumentId.HasValue)
        {
            var doc = await _db.Documents.FindAsync(request.DocumentId.Value);
            if (doc != null)
            {
                source = doc.Title;
            }
        }

        var deck = new FlashcardDeck
        {
            UserId = userId,
            Name = request.FlashcardName,
            Description = request.Description,
            Source = source,
            DocumentId = request.DocumentId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.FlashcardDecks.Add(deck);
        await _db.SaveChangesAsync();

        foreach (var idOrWord in request.ListVocabularyIds)
        {
            if (string.IsNullOrWhiteSpace(idOrWord)) continue;

            Vocabulary? vocab = null;
            if (long.TryParse(idOrWord, out long vocabId))
            {
                vocab = await _db.Vocabularies.FindAsync(vocabId);
            }
            if (vocab == null)
            {
                vocab = await _vocabRepo.GetByWordAsync(idOrWord);
            }
            if (vocab == null)
            {
                vocab = new Vocabulary
                {
                    Word = idOrWord,
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

            var existingFlashcard = await _db.Flashcards.FirstOrDefaultAsync(f => f.UserVocabularyId == uv.Id && f.DeckId == deck.Id);
            if (existingFlashcard == null)
            {
                var flashcard = new Flashcard
                {
                    UserVocabularyId = uv.Id,
                    DeckId = deck.Id,
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

    public async Task<FlashcardDeck?> DuplicateDeckAsync(long userId, long deckId)
    {
        var originalDeck = await _db.FlashcardDecks
            .Include(d => d.Flashcards)
            .FirstOrDefaultAsync(d => d.Id == deckId && d.UserId == userId);

        if (originalDeck == null) return null;

        var duplicatedDeck = new FlashcardDeck
        {
            UserId = userId,
            Name = $"{originalDeck.Name} (Copy)",
            Description = originalDeck.Description,
            Source = originalDeck.Source,
            DocumentId = originalDeck.DocumentId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.FlashcardDecks.Add(duplicatedDeck);
        await _db.SaveChangesAsync();

        // Duplicate all flashcards in the deck
        foreach (var originalFlashcard in originalDeck.Flashcards)
        {
            var duplicatedFlashcard = new Flashcard
            {
                UserVocabularyId = originalFlashcard.UserVocabularyId,
                DeckId = duplicatedDeck.Id,
                LearnStatus = "new",
                FlipStatus = "active",
                CreatedAt = DateTime.UtcNow,
                LastStudiedAt = DateTime.UtcNow
            };
            _db.Flashcards.Add(duplicatedFlashcard);
        }

        await _db.SaveChangesAsync();
        return duplicatedDeck;
    }

    public async Task<object> GetDashboardStatsAsync(long userId)
    {
        var decks = await _db.FlashcardDecks
            .Include(d => d.Flashcards)
                .ThenInclude(f => f.UserVocabulary)
            .Where(d => d.UserId == userId)
            .ToListAsync();

        var totalDecks = decks.Count;
        var totalWords = decks.Sum(d => d.Flashcards.Count);
        var masteredWords = decks.Sum(d => d.Flashcards.Count(f => f.LearnStatus == "mastered"));
        var learningWords = decks.Sum(d => d.Flashcards.Count(f => f.LearnStatus != "new" && f.LearnStatus != "mastered"));

        // Calculate words due for review (SRS)
        var now = DateTime.UtcNow;
        var dueForReview = decks.Sum(d => d.Flashcards.Count(f =>
        {
            if (f.UserVocabulary == null || f.UserVocabulary.LastReviewed == null) return false;
            var daysToAdd = f.UserVocabulary.MasteryLevel > 0 ? f.UserVocabulary.MasteryLevel * 2 : 1;
            return f.UserVocabulary.LastReviewed.Value.AddDays(daysToAdd) <= now;
        }));

        // Calculate total XP from flashcard activities
        var userStats = await _db.UserStats.FirstOrDefaultAsync(s => s.UserId == userId);
        var totalXp = userStats?.TotalXp ?? 0;

        return new
        {
            totalDecks,
            totalWords,
            masteredWords,
            learningWords,
            dueForReview,
            totalXp
        };
    }

    public async Task<List<object>> GetReviewCardsAsync(long userId, long? deckId = null)
    {
        var dueFlashcardIds = await _srsService.GetDueFlashcardIdsAsync(userId, deckId);

        var flashcards = await _db.Flashcards
            .Include(f => f.UserVocabulary)
                .ThenInclude(uv => uv.Vocabulary)
                    .ThenInclude(v => v.ExampleSentencesNavigation)
            .Where(f => dueFlashcardIds.Contains(f.Id))
            .ToListAsync();

        return flashcards.Select(f => {
            string translation = CleanTranslation(f.UserVocabulary.Vocabulary.Definitions);

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
                hanViet = f.UserVocabulary.Vocabulary.HanViet,
                collocations = f.UserVocabulary.Vocabulary.Collocations,
                grammarPatterns = f.UserVocabulary.Vocabulary.GrammarPatterns,
                context = f.UserVocabulary.Vocabulary.UsageNotes,
                examples = f.UserVocabulary.Vocabulary.ExampleSentencesNavigation.Select(e => new {
                    zhText = e.ZhText,
                    viText = e.ViText,
                    pinyin = ""
                }).ToList()
            };
        }).ToList();
    }

    public async Task<bool> SubmitReviewAsync(long userId, long flashcardId, FlipResult result, int responseMs)
    {
        var flashcard = await _db.Flashcards
            .Include(f => f.UserVocabulary)
            .FirstOrDefaultAsync(f => f.Id == flashcardId && f.UserVocabulary.UserId == userId);

        if (flashcard == null) return false;

        await _srsService.ProcessReviewAsync(flashcardId, result, responseMs);

        // Award XP for review
        await _statsService.AwardXpAsync(userId, 5, "Ôn tập SRS");
        await _statsService.TrackFlashcardSessionAsync(userId, 1, result == FlipResult.Know ? 1 : 0);

        return true;
    }

    public async Task<List<object>> GetWriteModeCardsAsync(long userId, long? deckId = null, int count = 10)
    {
        var query = _db.Flashcards
            .Include(f => f.UserVocabulary)
                .ThenInclude(uv => uv.Vocabulary)
            .Where(f => f.UserVocabulary.UserId == userId);

        if (deckId.HasValue)
        {
            query = query.Where(f => f.DeckId == deckId.Value);
        }

        // Prioritize cards that need practice (not mastered)
        query = query.OrderBy(f => f.UserVocabulary.MasteryLevel)
                     .ThenBy(f => f.UserVocabulary.LastReviewed);

        var flashcards = await query.Take(count).ToListAsync();

        return flashcards.Select(f => {
            string translation = CleanTranslation(f.UserVocabulary.Vocabulary.Definitions);

            return (object)new {
                id = f.Id,
                userVocabularyId = f.UserVocabularyId,
                deckId = f.DeckId,
                text = f.UserVocabulary.Vocabulary.Word,
                pinyin = f.UserVocabulary.Vocabulary.Pinyin,
                correctAnswer = translation,
                wordType = f.UserVocabulary.Vocabulary.WordType?.ToString() ?? "Other"
            };
        }).ToList();
    }

    public async Task<bool> SubmitWriteAnswerAsync(long userId, long flashcardId, string userAnswer)
    {
        var flashcard = await _db.Flashcards
            .Include(f => f.UserVocabulary)
                .ThenInclude(uv => uv.Vocabulary)
            .FirstOrDefaultAsync(f => f.Id == flashcardId && f.UserVocabulary.UserId == userId);

        if (flashcard == null) return false;

        string correctAnswer = "";
        try {
            var doc = JsonDocument.Parse(flashcard.UserVocabulary.Vocabulary.Definitions);
            correctAnswer = doc.RootElement[0].GetProperty("meaning").GetString() ?? "";
        } catch { }

        // Simple string comparison (can be improved with fuzzy matching)
        bool isCorrect = userAnswer.Trim().ToLower().Contains(correctAnswer.Trim().ToLower()) ||
                         correctAnswer.Trim().ToLower().Contains(userAnswer.Trim().ToLower());

        // Update SRS based on result
        var result = isCorrect ? FlipResult.Know : FlipResult.StillLearning;
        await _srsService.ProcessReviewAsync(flashcardId, result, 0);

        // Award XP
        await _statsService.AwardXpAsync(userId, isCorrect ? 10 : 5, "Write Mode");
        await _statsService.TrackFlashcardSessionAsync(userId, 1, isCorrect ? 1 : 0);

        return isCorrect;
    }

    public async Task<object> StartMatchGameAsync(long userId, long? deckId = null, int cardCount = 8)
    {
        var query = _db.Flashcards
            .Include(f => f.UserVocabulary)
                .ThenInclude(uv => uv.Vocabulary)
            .Where(f => f.UserVocabulary.UserId == userId);

        if (deckId.HasValue)
        {
            query = query.Where(f => f.DeckId == deckId.Value);
        }

        var flashcards = await query.OrderBy(f => Guid.NewGuid()).Take(cardCount).ToListAsync();

        if (flashcards.Count < 4)
        {
            return new { error = "Cần ít nhất 4 thẻ để chơi Match Mode." };
        }

        // Create study session
        var session = new StudySession
        {
            UserId = userId,
            Mode = FlashcardMode.Flashcard,
            StartedAt = DateTime.UtcNow,
            TotalCards = flashcards.Count
        };
        _db.StudySessions.Add(session);
        await _db.SaveChangesAsync();

        // Create match game
        var matchGame = new MatchGame
        {
            SessionId = session.Id,
            CardCount = flashcards.Count
        };
        _db.MatchGames.Add(matchGame);
        await _db.SaveChangesAsync();

        // Prepare pairs (word + meaning)
        var cards = flashcards.Select(f => {
            string translation = CleanTranslation(f.UserVocabulary.Vocabulary.Definitions);

            return new {
                id = f.Id,
                word = f.UserVocabulary.Vocabulary.Word,
                meaning = translation,
                pinyin = f.UserVocabulary.Vocabulary.Pinyin
            };
        }).ToList();

        return new {
            matchGameId = matchGame.Id,
            sessionId = session.Id,
            cards = cards
        };
    }

    public async Task<bool> SubmitMatchPairAsync(long userId, long matchGameId, long flashcardId1, long flashcardId2)
    {
        var flashcard1 = await _db.Flashcards
            .Include(f => f.UserVocabulary)
            .FirstOrDefaultAsync(f => f.Id == flashcardId1 && f.UserVocabulary.UserId == userId);

        var flashcard2 = await _db.Flashcards
            .Include(f => f.UserVocabulary)
            .FirstOrDefaultAsync(f => f.Id == flashcardId2 && f.UserVocabulary.UserId == userId);

        if (flashcard1 == null || flashcard2 == null) return false;

        // Check if they belong to the same vocabulary (correct match)
        bool isMatch = flashcard1.UserVocabulary.VocabularyId == flashcard2.UserVocabulary.VocabularyId;

        if (isMatch)
        {
            // Create match pair record
            var matchPair = new MatchPair
            {
                MatchGameId = matchGameId,
                FlashcardId = flashcardId1
            };
            _db.MatchPairs.Add(matchPair);
            await _db.SaveChangesAsync();

            // Update SRS for both cards
            await _srsService.ProcessReviewAsync(flashcardId1, FlipResult.Know, 0);
            await _srsService.ProcessReviewAsync(flashcardId2, FlipResult.Know, 0);
        }

        return isMatch;
    }

    public async Task<bool> CompleteMatchGameAsync(long userId, long matchGameId)
    {
        var matchGame = await _db.MatchGames
            .Include(m => m.Session)
            .FirstOrDefaultAsync(m => m.Id == matchGameId && m.Session.UserId == userId);

        if (matchGame == null) return false;

        matchGame.CompletedAt = DateTime.UtcNow;
        var timeSpan = matchGame.CompletedAt - matchGame.Session.StartedAt;
        matchGame.TimeSeconds = timeSpan != null ? (int)timeSpan.Value.TotalSeconds : 0;

        matchGame.Session.EndedAt = DateTime.UtcNow;
        matchGame.Session.CardsKnow = _db.MatchPairs.Count(p => p.MatchGameId == matchGameId);

        _db.MatchGames.Update(matchGame);
        _db.StudySessions.Update(matchGame.Session);
        await _db.SaveChangesAsync();

        // Award XP
        int xp = matchGame.CardCount * 5;
        await _statsService.AwardXpAsync(userId, xp, "Match Mode");
        await _statsService.TrackFlashcardSessionAsync(userId, matchGame.Session.CardsKnow ?? 0, matchGame.Session.CardsKnow ?? 0);

        return true;
    }

    private static string CleanTranslation(string definitionsJson)
    {
        if (string.IsNullOrWhiteSpace(definitionsJson))
            return "No meaning";

        try
        {
            string current = definitionsJson;
            for (int i = 0; i < 5; i++)
            {
                current = current.Trim();
                if (!(current.StartsWith("[") && current.EndsWith("]")) && !(current.StartsWith("{") && current.EndsWith("}")))
                {
                    break;
                }

                using var doc = JsonDocument.Parse(current);
                if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
                {
                    var first = doc.RootElement[0];
                    if (first.ValueKind == JsonValueKind.Object && first.TryGetProperty("meaning", out var meaningProp))
                    {
                        current = meaningProp.GetString() ?? "";
                    }
                    else
                    {
                        break;
                    }
                }
                else if (doc.RootElement.ValueKind == JsonValueKind.Object && doc.RootElement.TryGetProperty("meaning", out var meaningProp))
                {
                    current = meaningProp.GetString() ?? "";
                }
                else
                {
                    break;
                }
            }
            return string.IsNullOrWhiteSpace(current) ? "No meaning" : current;
        }
        catch
        {
            return "No meaning";
        }
    }
}
