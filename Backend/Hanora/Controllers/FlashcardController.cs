using BusinessObjects.Models;
using DataAccessObjects;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hanora.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FlashcardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public FlashcardController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserFlashcards(long userId)
        {
            var flashcards = await _context.Flashcards
                .Include(f => f.UserVocabulary)
                    .ThenInclude(uv => uv.Vocabulary)
                .Where(f => f.UserVocabulary != null && f.UserVocabulary.UserId == userId)
                .Select(f => new {
                    f.Id,
                    f.UserVocabularyId,
                    f.FlipStatus,
                    f.LearnStatus,
                    f.LastStudiedAt,
                    Word = new {
                        Text = f.UserVocabulary.Vocabulary.Word,
                        Pinyin = f.UserVocabulary.Vocabulary.Pinyin,
                        Definitions = f.UserVocabulary.Vocabulary.Definitions,
                        ExampleSentences = f.UserVocabulary.Vocabulary.ExampleSentences,
                        WordType = f.UserVocabulary.Vocabulary.WordType
                    }
                })
                .ToListAsync();

            return Ok(flashcards);
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(long id, [FromBody] UpdateStatusDto request)
        {
            var flashcard = await _context.Flashcards.FindAsync(id);
            if (flashcard == null) return NotFound();

            if (!string.IsNullOrEmpty(request.FlipStatus)) flashcard.FlipStatus = request.FlipStatus;
            if (!string.IsNullOrEmpty(request.LearnStatus)) flashcard.LearnStatus = request.LearnStatus;
            flashcard.LastStudiedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(flashcard);
        }
    }

    public class UpdateStatusDto
    {
        public string? FlipStatus { get; set; }
        public string? LearnStatus { get; set; }
    }
}
