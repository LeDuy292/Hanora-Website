using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services;
using System.Security.Claims;

namespace Hanora.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class StatsController : ControllerBase
{
    private readonly IStatsService _statsService;

    public StatsController(IStatsService statsService)
    {
        _statsService = statsService;
    }

    /// <summary>
    /// Returns the current user's gamification stats and advances the
    /// daily-login streak. The frontend calls this after login and on app load.
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var userId))
            return Unauthorized();

        var stats = await _statsService.TouchAndGetAsync(userId);
        return Ok(stats);
    }

    public record TrackTimeRequest(int Minutes);

    /// <summary>
    /// Logs active learning study time (in minutes) for the user.
    /// </summary>
    [HttpPost("track-time")]
    public async Task<IActionResult> TrackTime([FromBody] TrackTimeRequest req)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var userId))
            return Unauthorized();

        if (req.Minutes <= 0)
            return BadRequest("Minutes must be greater than 0.");

        await _statsService.TrackTimeAsync(userId, req.Minutes);
        return Ok(new { success = true });
    }

    public record TrackPronunciationScoreRequest(double Score);

    /// <summary>
    /// Logs pronunciation practice session score.
    /// </summary>
    [HttpPost("pronunciation-score")]
    public async Task<IActionResult> TrackPronunciationScore([FromBody] TrackPronunciationScoreRequest req)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var userId))
            return Unauthorized();

        if (req.Score < 0 || req.Score > 100)
            return BadRequest("Score must be between 0 and 100.");

        await _statsService.TrackPronunciationScoreAsync(userId, req.Score);
        return Ok(new { success = true });
    }
}
