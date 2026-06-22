using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services;
using System.Security.Claims;

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
    public async Task<IActionResult> GetUserFlashcards()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        
        long userId = long.Parse(userIdClaim.Value);
        var flashcards = await _flashcardService.GetUserFlashcardsAsync(userId);
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
}

public class UpdateFlashcardStatusRequest
{
    public string Word { get; set; } = null!;
    public string Status { get; set; } = null!; // "new", "learning", "mastered"
    public int MasteryLevel { get; set; }
}
