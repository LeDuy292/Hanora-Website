using BusinessObjects.Models;
using Microsoft.EntityFrameworkCore;

namespace DataAccessObjects;

public partial class AppDbContext
{
    public virtual DbSet<TranslationReview> TranslationReviews { get; set; }

    public virtual DbSet<TranslationReviewHistory> TranslationReviewHistories { get; set; }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TranslationReview>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("translation_reviews_pkey");
            entity.ToTable("translation_reviews");
            entity.HasIndex(e => new { e.Status, e.Priority, e.CreatedAt }, "idx_translation_reviews_status_priority");
            entity.HasIndex(e => new { e.SourceType, e.SourceEntityId }, "idx_translation_reviews_source");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.SourceType).HasMaxLength(40).HasColumnName("source_type");
            entity.Property(e => e.SourceEntityId).HasColumnName("source_entity_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.SourceLanguage).HasMaxLength(10).HasDefaultValue("ZH").HasColumnName("source_language");
            entity.Property(e => e.TargetLanguage).HasMaxLength(10).HasDefaultValue("VI").HasColumnName("target_language");
            entity.Property(e => e.SourceText).HasColumnName("source_text");
            entity.Property(e => e.CurrentTranslation).HasColumnName("current_translation");
            entity.Property(e => e.ProposedTranslation).HasColumnName("proposed_translation");
            entity.Property(e => e.AiExplanation).HasColumnName("ai_explanation");
            entity.Property(e => e.ExampleText).HasColumnName("example_text");
            entity.Property(e => e.Pinyin).HasMaxLength(255).HasColumnName("pinyin");
            entity.Property(e => e.WordType).HasMaxLength(50).HasColumnName("word_type");
            entity.Property(e => e.WarningType).HasMaxLength(50).HasDefaultValue("new_word").HasColumnName("warning_type");
            entity.Property(e => e.ConfidenceScore).HasPrecision(5, 2).HasColumnName("confidence_score");
            entity.Property(e => e.ReportCount).HasDefaultValue(0).HasColumnName("report_count");
            entity.Property(e => e.Priority).HasDefaultValue(0).HasColumnName("priority");
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Pending").HasColumnName("status");
            entity.Property(e => e.AdminNote).HasColumnName("admin_note");
            entity.Property(e => e.ReviewedBy).HasColumnName("reviewed_by");
            entity.Property(e => e.ReviewedAt).HasColumnName("reviewed_at");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()").HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("now()").HasColumnName("updated_at");

            entity.HasOne(d => d.User).WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("translation_reviews_user_id_fkey");

            entity.HasOne(d => d.ReviewedByNavigation).WithMany()
                .HasForeignKey(d => d.ReviewedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("translation_reviews_reviewed_by_fkey");
        });

        modelBuilder.Entity<TranslationReviewHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("translation_review_history_pkey");
            entity.ToTable("translation_review_history");
            entity.HasIndex(e => e.ReviewId, "idx_translation_review_history_review");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ReviewId).HasColumnName("review_id");
            entity.Property(e => e.AdminId).HasColumnName("admin_id");
            entity.Property(e => e.Action).HasMaxLength(40).HasColumnName("action");
            entity.Property(e => e.PreviousStatus).HasMaxLength(20).HasColumnName("previous_status");
            entity.Property(e => e.NewStatus).HasMaxLength(20).HasColumnName("new_status");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.SnapshotJson).HasColumnType("jsonb").HasColumnName("snapshot_json");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("now()").HasColumnName("created_at");

            entity.HasOne(d => d.Review).WithMany(p => p.History)
                .HasForeignKey(d => d.ReviewId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("translation_review_history_review_id_fkey");

            entity.HasOne(d => d.Admin).WithMany()
                .HasForeignKey(d => d.AdminId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("translation_review_history_admin_id_fkey");
        });
    }
}
