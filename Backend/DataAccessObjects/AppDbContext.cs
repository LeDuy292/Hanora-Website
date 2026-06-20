using BusinessObjects.Models;
using Microsoft.EntityFrameworkCore;

namespace DataAccessObjects
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.HasPostgresEnum("word_type_enum", new[]
            {
                "noun","verb","adjective","adverb","pronoun","preposition",
                "conjunction","particle","measure_word","interjection","other"
            });
            modelBuilder.HasPostgresEnum("flashcard_mode_enum", new[] { "flashcard", "test" });
            modelBuilder.HasPostgresEnum("flip_result_enum", new[] { "know", "still_learning" });
            modelBuilder.HasPostgresEnum("learn_result_enum", new[] { "correct", "incorrect" });
            modelBuilder.HasPostgresEnum("document_status_enum", new[] { "processing", "ready", "failed" });
            modelBuilder.HasPostgresEnum("leaderboard_period_enum", new[] { "daily", "weekly", "monthly", "all_time" });
            modelBuilder.HasPostgresEnum("channel_type_enum", new[] { "public", "private" });
            modelBuilder.HasPostgresEnum("report_status_enum", new[] { "pending", "reviewed", "dismissed", "action_taken" });

            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("users");
                entity.HasIndex(u => u.Email).IsUnique();
                entity.HasIndex(u => u.Username).IsUnique();
                entity.HasIndex(u => u.GoogleId);

                entity.Property(u => u.CreatedAt).HasDefaultValueSql("NOW()");
                entity.Property(u => u.UpdatedAt).HasDefaultValueSql("NOW()");
                entity.Property(u => u.IsActive).HasDefaultValue(true);
            });
        }
    }
}
