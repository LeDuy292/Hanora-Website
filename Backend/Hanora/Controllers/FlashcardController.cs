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
    public async Task<IActionResult> GetUserDecks()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        
        long userId = long.Parse(userIdClaim.Value);
        var decks = await _flashcardService.GetUserDecksAsync(userId);
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
