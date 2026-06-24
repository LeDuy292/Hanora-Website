using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Hanora.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class LeaderboardController : ControllerBase
    {
        private readonly ILeaderboardService _leaderboardService;

        public LeaderboardController(ILeaderboardService leaderboardService)
        {
            _leaderboardService = leaderboardService;
        }

        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] string? period, [FromQuery] string? criteria)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized();

            var result = await _leaderboardService.GetLeaderboardAsync(userId, period ?? "global", criteria ?? "default");
            return Ok(result);
        }
    }
}
