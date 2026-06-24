using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services;

namespace Hanora.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.IdToken))
                return BadRequest(new { error = "idToken is required." });

            var result = await _authService.GoogleLoginAsync(req.IdToken);
            if (!result.Success)
                return Unauthorized(new { error = result.Error });

            return Ok(new { token = result.Token, user = result.User });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { error = "Email và mật khẩu không được để trống." });

            var result = await _authService.LoginAsync(req.Email, req.Password);
            if (!result.Success)
                return Unauthorized(new { error = result.Error });

            return Ok(new { token = result.Token, user = result.User });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { error = "Vui lòng điền đầy đủ thông tin." });

            var result = await _authService.RegisterAsync(req.Username, req.Email, req.Password);
            if (!result.Success)
                return Conflict(new { error = result.Error });

            return Ok(new { token = result.Token, user = result.User });
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized();

            var user = await _authService.GetUserByIdAsync(userId);
            if (user == null)
                return NotFound(new { error = "User not found." });

            return Ok(user);
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest req)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized();

            var result = await _authService.UpdateProfileAsync(userId, req);
            if (!result.Success)
                return BadRequest(new { error = result.Error });

            return Ok(new { user = result.User, token = result.Token });
        }
    }

    public record GoogleLoginRequest(string IdToken);
    public record LoginRequest(string Email, string Password);
    public record RegisterRequest(string Username, string Email, string Password);
}
