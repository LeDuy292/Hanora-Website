using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services;
using System.Security.Claims;

namespace Hanora.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ProgressController : ControllerBase
{
    private readonly IProgressService _progressService;

    public ProgressController(IProgressService progressService)
    {
        _progressService = progressService;
    }

    /// <summary>
    /// Aggregated Learning Progress Dashboard for the current user: streak, XP/level,
    /// daily goal, SRS due count, vocabulary notebook, growth chart, recent documents,
    /// weekly stats, and achievements. All metrics are computed live.
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var userId))
            return Unauthorized();

        var dashboard = await _progressService.GetDashboardAsync(userId);
        return Ok(dashboard);
    }
}
