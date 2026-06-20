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
    }

    public record AuthResult(bool Success, string? Token, UserDto? User, string? Error);

    public record UserDto(long Id, string Username, string Email, string? DisplayName, string? AvatarUrl, DateTime CreatedAt);

    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepo;
        private readonly IConfiguration _config;

        public AuthService(IUserRepository userRepo, IConfiguration config)
        {
            _userRepo = userRepo;
            _config = config;
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
                    PasswordHash = null,
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
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.Name, user.DisplayName ?? user.Username),
                new Claim("username", user.Username),
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

        private static UserDto ToDto(User u) =>
            new(u.Id, u.Username, u.Email, u.DisplayName, u.AvatarUrl, u.CreatedAt);
    }
}
