using BusinessObjects.Models;
using DataAccessObjects;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Services;

public class SrsService : ISrsService
{
    private readonly AppDbContext _db;

    public SrsService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Calculate the next review date based on SM-2 algorithm variant
    /// Mastery levels: 0=new, 1=1 day, 2=3 days, 3=7 days, 4=14 days, 5=30 days, 6+=exponential
    /// </summary>
    public DateTime CalculateNextReviewDate(int masteryLevel, DateTime lastReviewed, FlipResult result)
    {
        int daysToAdd;

        if (result == FlipResult.StillLearning)
        {
            // Reset or reduce interval on incorrect answer
            daysToAdd = 1; // Review again tomorrow
        }
        else
        {
            // Increase interval based on mastery level
            switch (masteryLevel)
            {
                case 0:
                    daysToAdd = 1;
                    break;
                case 1:
                    daysToAdd = 3;
                    break;
                case 2:
                    daysToAdd = 7;
                    break;
                case 3:
                    daysToAdd = 14;
                    break;
                case 4:
                    daysToAdd = 30;
                    break;
                case 5:
                    daysToAdd = 60;
                    break;
                default:
                    // Exponential growth for higher levels
                    daysToAdd = (int)(30 * Math.Pow(1.5, masteryLevel - 4));
                    break;
            }
        }

        return lastReviewed.AddDays(daysToAdd);
    }

    /// <summary>
    /// Update mastery level based on review result
    /// </summary>
    public int UpdateMasteryLevel(int currentLevel, FlipResult result)
    {
        if (result == FlipResult.Know)
        {
            // Increase mastery level on correct answer
            return currentLevel + 1;
        }
        else
        {
            // Decrease mastery level on incorrect answer (minimum 0)
            return Math.Max(0, currentLevel - 1);
        }
    }

    /// <summary>
    /// Get flashcards due for review
    /// </summary>
    public async Task<List<long>> GetDueFlashcardIdsAsync(long userId, long? deckId = null)
    {
        var now = DateTime.UtcNow;

        var query = _db.Flashcards
            .Include(f => f.UserVocabulary)
            .Include(f => f.Deck)
            .Where(f => f.UserVocabulary.UserId == userId);

        if (deckId.HasValue)
        {
            query = query.Where(f => f.DeckId == deckId.Value);
        }

        var flashcards = await query.ToListAsync();

        var dueFlashcardIds = flashcards
            .Where(f =>
            {
                if (f.UserVocabulary == null || f.UserVocabulary.LastReviewed == null)
                    return true; // New cards are due immediately

                var daysToAdd = f.UserVocabulary.MasteryLevel > 0 ? f.UserVocabulary.MasteryLevel * 2 : 1;
                return f.UserVocabulary.LastReviewed.Value.AddDays(daysToAdd) <= now;
            })
            .Select(f => f.Id)
            .ToList();

        return dueFlashcardIds;
    }

    /// <summary>
    /// Process a flashcard review and update SRS data
    /// </summary>
    public async Task ProcessReviewAsync(long flashcardId, FlipResult result, int responseMs)
    {
        var flashcard = await _db.Flashcards
            .Include(f => f.UserVocabulary)
            .FirstOrDefaultAsync(f => f.Id == flashcardId);

        if (flashcard == null || flashcard.UserVocabulary == null)
            return;

        // Update mastery level
        flashcard.UserVocabulary.MasteryLevel = UpdateMasteryLevel(
            flashcard.UserVocabulary.MasteryLevel,
            result);

        // Update last reviewed time
        flashcard.UserVocabulary.LastReviewed = DateTime.UtcNow;

        // Update flashcard status
        flashcard.LastStudiedAt = DateTime.UtcNow;
        flashcard.FlipStatus = result == FlipResult.Know ? "know" : "still_learning";

        // Update learn status based on mastery level
        if (flashcard.UserVocabulary.MasteryLevel >= 3)
        {
            flashcard.LearnStatus = "mastered";
            flashcard.UserVocabulary.IsMastered = true;
        }
        else if (flashcard.UserVocabulary.MasteryLevel > 0)
        {
            flashcard.LearnStatus = "learning";
            flashcard.UserVocabulary.IsMastered = false;
        }
        else
        {
            flashcard.LearnStatus = "new";
            flashcard.UserVocabulary.IsMastered = false;
        }

        // Update correct/wrong counts
        if (result == FlipResult.Know)
        {
            flashcard.UserVocabulary.CorrectCount++;
        }
        else
        {
            flashcard.UserVocabulary.WrongCount++;
        }

        _db.Flashcards.Update(flashcard);
        _db.UserVocabularies.Update(flashcard.UserVocabulary);
        await _db.SaveChangesAsync();
    }
}
