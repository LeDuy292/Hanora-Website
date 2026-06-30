using BusinessObjects.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Hanora.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FlashcardController : ControllerBase
{
    private readonly IFlashcardService _flashcardService;

    public FlashcardController(IFlashcardService flashcardService)
    {
        _flashcardService = flashcardService;
    }

    [HttpGet]
    public async Task<IActionResult> GetUserFlashcards([FromQuery] long? deckId = null)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        
        long userId = long.Parse(userIdClaim.Value);
        var flashcards = await _flashcardService.GetUserFlashcardsAsync(userId, deckId);
        return Ok(flashcards);
    }

    [HttpPost("status")]
    public async Task<IActionResult> UpdateStatus([FromBody] UpdateFlashcardStatusRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        long userId = long.Parse(userIdClaim.Value);
        var result = await _flashcardService.UpdateStatusAsync(userId, request.Word, request.Status, request.MasteryLevel);
        
        if (!result) return BadRequest(new { error = "Không thể cập nhật trạng thái từ vựng." });
        return Ok(new { message = "Cập nhật thành công." });
    }

    [HttpGet("decks")]
    public async Task<IActionResult> GetUserDecks([FromQuery] string? search = null, [FromQuery] string? filter = null, [FromQuery] string? sort = null)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        long userId = long.Parse(userIdClaim.Value);
        var decks = await _flashcardService.GetUserDecksAsync(userId, search, filter, sort);
        return Ok(decks);
    }

    [HttpPost("decks")]
    public async Task<IActionResult> CreateDeck([FromBody] CreateDeckRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        
        long userId = long.Parse(userIdClaim.Value);
        var deck = await _flashcardService.CreateDeckAsync(userId, request.Name, request.Source, request.DocumentId);
        return Ok(deck);
    }

    [HttpPost("decks/bulk-add")]
    public async Task<IActionResult> BulkAddCards([FromBody] BulkAddCardsRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        
        long userId = long.Parse(userIdClaim.Value);
        var result = await _flashcardService.BulkAddCardsAsync(userId, request);
        return Ok(new { success = result });
    }

    [HttpPost("session/complete")]
    public async Task<IActionResult> CompleteSession([FromBody] CompleteSessionRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        
        long userId = long.Parse(userIdClaim.Value);
        await _flashcardService.CompleteSessionAsync(
            userId,
            request.DeckId,
            request.CardsStudied,
            request.KnowCount,
            request.CompletedDeck,
            request.CompletedWithoutInterruption);
            
        return Ok(new { message = "Session completed successfully." });
    }

    [HttpPost("/api/flashcards")]
    public async Task<IActionResult> CreateFlashcardSet([FromBody] CreateFlashcardSetRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        
        long userId = long.Parse(userIdClaim.Value);
        
        if (request.ListVocabularyIds == null || request.ListVocabularyIds.Count < 1)
        {
            return BadRequest(new {
                success = false,
                message = "Bạn cần chọn ít nhất 1 từ vựng để tạo Flashcard."
            });
        }
        
        var result = await _flashcardService.CreateFlashcardSetAsync(userId, request);
        if (!result)
        {
            return BadRequest(new {
                success = false,
                message = "Không thể tạo bộ Flashcard."
            });
        }
        
        return StatusCode(201, new {
            success = true,
            message = "Tạo Flashcard thành công."
        });
    }

    [HttpPut("decks/{id}")]
    public async Task<IActionResult> UpdateDeck(long id, [FromBody] UpdateDeckRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        
        long userId = long.Parse(userIdClaim.Value);
        var result = await _flashcardService.UpdateDeckAsync(userId, id, request.Name, request.Description);
        if (!result) return NotFound(new { error = "Không tìm thấy bộ Flashcard hoặc bạn không có quyền sửa." });
        return Ok(new { message = "Cập nhật thành công." });
    }

    [HttpDelete("decks/{id}")]
    public async Task<IActionResult> DeleteDeck(long id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        
        long userId = long.Parse(userIdClaim.Value);
        var result = await _flashcardService.DeleteDeckAsync(userId, id);
        if (!result) return NotFound(new { error = "Không tìm thấy bộ Flashcard hoặc bạn không có quyền xóa." });
        return Ok(new { message = "Xóa thành công." });
    }

    [HttpDelete("cards/{id}")]
    public async Task<IActionResult> RemoveCard(long id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        long userId = long.Parse(userIdClaim.Value);
        var result = await _flashcardService.RemoveCardFromDeckAsync(userId, id);
        if (!result) return BadRequest(new { error = "Không thể xóa thẻ này." });
        return Ok(new { message = "Xóa thành công." });
    }

    [HttpPost("decks/{id}/duplicate")]
    public async Task<IActionResult> DuplicateDeck(long id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        long userId = long.Parse(userIdClaim.Value);
        var duplicatedDeck = await _flashcardService.DuplicateDeckAsync(userId, id);
        if (duplicatedDeck == null) return NotFound(new { error = "Không tìm thấy bộ Flashcard hoặc bạn không có quyền sao chép." });
        return Ok(duplicatedDeck);
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        long userId = long.Parse(userIdClaim.Value);
        var stats = await _flashcardService.GetDashboardStatsAsync(userId);
        return Ok(stats);
    }

    [HttpGet("review")]
    public async Task<IActionResult> GetReviewCards([FromQuery] long? deckId = null)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        long userId = long.Parse(userIdClaim.Value);
        var cards = await _flashcardService.GetReviewCardsAsync(userId, deckId);
        return Ok(cards);
    }

    [HttpPost("review/{flashcardId}")]
    public async Task<IActionResult> SubmitReview(long flashcardId, [FromBody] SubmitReviewRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        long userId = long.Parse(userIdClaim.Value);
        var result = await _flashcardService.SubmitReviewAsync(userId, flashcardId, request.Result, request.ResponseMs);
        if (!result) return BadRequest(new { error = "Không thể gửi đánh giá." });
        return Ok(new { message = "Đánh giá đã được lưu." });
    }

    [HttpGet("write")]
    public async Task<IActionResult> GetWriteModeCards([FromQuery] long? deckId = null, [FromQuery] int count = 10)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        long userId = long.Parse(userIdClaim.Value);
        var cards = await _flashcardService.GetWriteModeCardsAsync(userId, deckId, count);
        return Ok(cards);
    }

    [HttpPost("write/{flashcardId}")]
    public async Task<IActionResult> SubmitWriteAnswer(long flashcardId, [FromBody] SubmitWriteAnswerRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        long userId = long.Parse(userIdClaim.Value);
        var isCorrect = await _flashcardService.SubmitWriteAnswerAsync(userId, flashcardId, request.UserAnswer);
        return Ok(new { isCorrect });
    }

    [HttpPost("match/start")]
    public async Task<IActionResult> StartMatchGame([FromBody] StartMatchGameRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        long userId = long.Parse(userIdClaim.Value);
        var game = await _flashcardService.StartMatchGameAsync(userId, request.DeckId, request.CardCount);
        return Ok(game);
    }

    [HttpPost("match/{matchGameId}/pair")]
    public async Task<IActionResult> SubmitMatchPair(long matchGameId, [FromBody] SubmitMatchPairRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        long userId = long.Parse(userIdClaim.Value);
        var isMatch = await _flashcardService.SubmitMatchPairAsync(userId, matchGameId, request.FlashcardId1, request.FlashcardId2);
        return Ok(new { isMatch });
    }

    [HttpPost("match/{matchGameId}/complete")]
    public async Task<IActionResult> CompleteMatchGame(long matchGameId)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        long userId = long.Parse(userIdClaim.Value);
        var result = await _flashcardService.CompleteMatchGameAsync(userId, matchGameId);
        if (!result) return BadRequest(new { error = "Không thể hoàn thành game." });
        return Ok(new { message = "Game hoàn thành." });
    }
}

public class UpdateDeckRequest
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
}

public class UpdateFlashcardStatusRequest
{
    public string Word { get; set; } = null!;
    public string Status { get; set; } = null!; // "new", "learning", "mastered"
    public int MasteryLevel { get; set; }
}

public class CreateDeckRequest
{
    public string Name { get; set; } = null!;
    public string? Source { get; set; }
    public long? DocumentId { get; set; }
}

public class CompleteSessionRequest
{
    public long? DeckId { get; set; }
    public int CardsStudied { get; set; }
    public int KnowCount { get; set; }
    public bool CompletedDeck { get; set; }
    public bool CompletedWithoutInterruption { get; set; }
}

public class SubmitReviewRequest
{
    public FlipResult Result { get; set; }
    public int ResponseMs { get; set; }
}

public class SubmitWriteAnswerRequest
{
    public string UserAnswer { get; set; } = null!;
}

public class StartMatchGameRequest
{
    public long? DeckId { get; set; }
    public int CardCount { get; set; } = 8;
}

public class SubmitMatchPairRequest
{
    public long FlashcardId1 { get; set; }
    public long FlashcardId2 { get; set; }
}
