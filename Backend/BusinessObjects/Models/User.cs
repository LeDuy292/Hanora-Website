using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BusinessObjects.Models
{
    [Table("users")]
    public class User
    {
        [Column("id")]
        public long Id { get; set; }

        [Required, MaxLength(50), Column("username")]
        public string Username { get; set; } = string.Empty;

        [Required, MaxLength(255), Column("email")]
        public string Email { get; set; } = string.Empty;

        [Column("password_hash")]
        public string? PasswordHash { get; set; }

        [Column("google_id")]
        public string? GoogleId { get; set; }

        [MaxLength(100), Column("display_name")]
        public string? DisplayName { get; set; }

        [Column("avatar_url")]
        public string? AvatarUrl { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
