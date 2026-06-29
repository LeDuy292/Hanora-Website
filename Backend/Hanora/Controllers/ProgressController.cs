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

    [HttpPut("goal")]
    public async Task<IActionResult> SetGoal([FromBody] SetGoalRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var userId))
            return Unauthorized();

        if (request.GoalMinutes <= 0)
        {
            return BadRequest(new { Message = "Mục tiêu học phải lớn hơn 0." });
        }

        await _progressService.SetGoalAsync(userId, request.GoalMinutes);
        var dashboard = await _progressService.GetDashboardAsync(userId);
        return Ok(dashboard);
    }
}

public class SetGoalRequest
{
    public int GoalMinutes { get; set; }
}
