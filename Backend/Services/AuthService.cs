using BusinessObjects.Models;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Repositories;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Services
{
    public interface IAuthService
    {
        Task<AuthResult> GoogleLoginAsync(string idToken);
        Task<AuthResult> LoginAsync(string email, string password);
        Task<AuthResult> RegisterAsync(string username, string email, string password);
        Task<UserDto?> GetUserByIdAsync(long id);
        Task<AuthResult> UpdateProfileAsync(long userId, UpdateProfileRequest req);
    }

    public record UpdateProfileRequest(
        string? DisplayName,
        string? Email,
        string? CurrentPassword,
        string? NewPassword,
        int? DailyMinutesGoal
    );

    public record AuthResult(bool Success, string? Token, UserDto? User, string? Error);

    public record UserDto(long Id, string Username, string Email, string? DisplayName, string? AvatarUrl, DateTime CreatedAt, string Role, bool IsActive);

    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepo;
        private readonly IConfiguration _config;
        private readonly IStatsRepository _statsRepo;

        public AuthService(IUserRepository userRepo, IConfiguration config, IStatsRepository statsRepo)
        {
            _userRepo = userRepo;
            _config = config;
            _statsRepo = statsRepo;
        }

        public async Task<AuthResult> GoogleLoginAsync(string idToken)
        {
            GoogleJsonWebSignature.Payload payload;
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { _config["Authentication:Google:ClientId"] }
                };
                payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
            }
            catch
            {
                return new AuthResult(false, null, null, "Invalid Google token.");
            }

            var user = await _userRepo.GetByGoogleIdAsync(payload.Subject)
                       ?? await _userRepo.GetByEmailAsync(payload.Email);

            if (user == null)
            {
                // Generate unique username from email prefix
                var baseUsername = payload.Email.Split('@')[0].ToLower();
                user = new User
                {
                    Username = baseUsername,
                    Email = payload.Email,
                    GoogleId = payload.Subject,
                    DisplayName = payload.Name,
                    AvatarUrl = payload.Picture,
                    PasswordHash = "google_auth",
                    Role = "User",
                };
                user = await _userRepo.CreateAsync(user);
            }
            else
            {
                if (user.GoogleId == null)
                    user.GoogleId = payload.Subject;
                user.AvatarUrl ??= payload.Picture;
                user.UpdatedAt = DateTime.UtcNow;
                await _userRepo.UpdateAsync(user);
            }

            return new AuthResult(true, GenerateJwt(user), ToDto(user), null);
        }

        public async Task<AuthResult> LoginAsync(string email, string password)
        {
            var user = await _userRepo.GetByEmailAsync(email);
            if (user == null || user.PasswordHash == null)
                return new AuthResult(false, null, null, "Email hoặc mật khẩu không đúng.");

            if (user.IsActive == false)
                return new AuthResult(false, null, null, "Tai khoan da bi khoa. Vui long lien he quan tri vien.");

            if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
                return new AuthResult(false, null, null, "Email hoặc mật khẩu không đúng.");

            user.UpdatedAt = DateTime.UtcNow;
            await _userRepo.UpdateAsync(user);

            return new AuthResult(true, GenerateJwt(user), ToDto(user), null);
        }

        public async Task<AuthResult> RegisterAsync(string username, string email, string password)
        {
            if (await _userRepo.GetByEmailAsync(email) != null)
                return new AuthResult(false, null, null, "Email đã được sử dụng.");

            var user = new User
            {
                Username = username.ToLower(),
                Email = email,
                DisplayName = username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                Role = "User",
            };
            user = await _userRepo.CreateAsync(user);

            return new AuthResult(true, GenerateJwt(user), ToDto(user), null);
        }

        private string GenerateJwt(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.Name, user.DisplayName ?? user.Username),
                new Claim("username", user.Username),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("role", user.Role),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public async Task<UserDto?> GetUserByIdAsync(long id)
        {
            var user = await _userRepo.GetByIdAsync(id);
            return user == null ? null : ToDto(user);
        }

        public async Task<AuthResult> UpdateProfileAsync(long userId, UpdateProfileRequest req)
        {
            var user = await _userRepo.GetByIdAsync(userId);
            if (user == null)
                return new AuthResult(false, null, null, "User not found.");

            // 1. Update Display Name if provided
            if (req.DisplayName != null)
            {
                user.DisplayName = req.DisplayName;
            }

            // 2. Update Email if provided
            if (!string.IsNullOrWhiteSpace(req.Email) && !req.Email.Equals(user.Email, StringComparison.OrdinalIgnoreCase))
            {
                var existingUser = await _userRepo.GetByEmailAsync(req.Email);
                if (existingUser != null && existingUser.Id != userId)
                {
                    return new AuthResult(false, null, null, "Email đã được sử dụng bởi tài khoản khác.");
                }
                user.Email = req.Email.ToLower();
            }

            // 3. Update Password if requested
            if (!string.IsNullOrWhiteSpace(req.NewPassword))
            {
                if (string.IsNullOrWhiteSpace(req.CurrentPassword))
                {
                    return new AuthResult(false, null, null, "Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu mới.");
                }
                if (user.PasswordHash != null && user.PasswordHash != "google_auth")
                {
                    if (!BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.PasswordHash))
                    {
                        return new AuthResult(false, null, null, "Mật khẩu hiện tại không đúng.");
                    }
                }
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
            }

            user.UpdatedAt = DateTime.UtcNow;
            await _userRepo.UpdateAsync(user);

            // 4. Update Daily Learning Goal if provided
            if (req.DailyMinutesGoal.HasValue)
            {
                await _statsRepo.SetDailyGoalMinutesAsync(userId, req.DailyMinutesGoal.Value);
            }

            return new AuthResult(true, GenerateJwt(user), ToDto(user), null);
        }

        private static UserDto ToDto(User u) =>
            new(u.Id, u.Username, u.Email, u.DisplayName, u.AvatarUrl, u.CreatedAt ?? DateTime.UtcNow, u.Role, u.IsActive ?? true);
    }
}
