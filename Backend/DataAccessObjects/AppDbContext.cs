using System;
using System.Collections.Generic;
using BusinessObjects.Models;
using Microsoft.EntityFrameworkCore;

namespace DataAccessObjects;

public partial class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Achievement> Achievements { get; set; }

    public virtual DbSet<ChannelMember> ChannelMembers { get; set; }

    public virtual DbSet<CommunityChannel> CommunityChannels { get; set; }

    public virtual DbSet<CommunityMessage> CommunityMessages { get; set; }

    public virtual DbSet<Document> Documents { get; set; }

    public virtual DbSet<DocumentPage> DocumentPages { get; set; }

    public virtual DbSet<DocumentReadingProgress> DocumentReadingProgresses { get; set; }

    public virtual DbSet<ExampleSentence> ExampleSentences { get; set; }

    public virtual DbSet<Flashcard> Flashcards { get; set; }

    public virtual DbSet<FlipReview> FlipReviews { get; set; }

    public virtual DbSet<LeaderboardSnapshot> LeaderboardSnapshots { get; set; }

    public virtual DbSet<LearnRound> LearnRounds { get; set; }

    public virtual DbSet<LearningProgress> LearningProgresses { get; set; }

    public virtual DbSet<MatchGame> MatchGames { get; set; }

    public virtual DbSet<MatchPair> MatchPairs { get; set; }

    public virtual DbSet<MessageReaction> MessageReactions { get; set; }

    public virtual DbSet<MessageReport> MessageReports { get; set; }

    public virtual DbSet<QuizQuestion> QuizQuestions { get; set; }

    public virtual DbSet<QuizSession> QuizSessions { get; set; }

    public virtual DbSet<QuizReview> QuizReviews { get; set; }

    public virtual DbSet<StudySession> StudySessions { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserAchievement> UserAchievements { get; set; }

    public virtual DbSet<UserLearningGoal> UserLearningGoals { get; set; }

    public virtual DbSet<UserStat> UserStats { get; set; }

    public virtual DbSet<UserVocabulary> UserVocabularies { get; set; }

    public virtual DbSet<Vocabulary> Vocabularies { get; set; }

    public virtual DbSet<VwLeaderboardAllTime> VwLeaderboardAllTimes { get; set; }

    public virtual DbSet<VwLeaderboardDaily> VwLeaderboardDailies { get; set; }

    public virtual DbSet<VwLeaderboardWeekly> VwLeaderboardWeeklies { get; set; }

    public virtual DbSet<VwUserDashboard> VwUserDashboards { get; set; }

    public virtual DbSet<WordRelation> WordRelations { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasPostgresEnum("channel_type_enum", new[] { "public", "private" })
            .HasPostgresEnum("document_status_enum", new[] { "processing", "ready", "failed" })
            .HasPostgresEnum("flashcard_mode_enum", new[] { "flashcard", "test" })
            .HasPostgresEnum("flip_result_enum", new[] { "know", "still_learning" })
            .HasPostgresEnum("leaderboard_period_enum", new[] { "daily", "weekly", "monthly", "all_time" })
            .HasPostgresEnum("learn_question_type_enum", new[] { "multiple_choice", "type_answer", "true_false" })
            .HasPostgresEnum("learn_result_enum", new[] { "correct", "incorrect" })
            .HasPostgresEnum("quiz_question_type_enum", new[] { "multiple_choice_meaning", "multiple_choice_word", "fill_in_blank", "pinyin_match" })
            .HasPostgresEnum("relation_type_enum", new[] { "synonym", "antonym", "compound" })
            .HasPostgresEnum("report_status_enum", new[] { "pending", "reviewed", "dismissed", "action_taken" })
            .HasPostgresEnum("word_type_enum", new[] { "noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "particle", "measure_word", "interjection", "other" });

        modelBuilder.Entity<Achievement>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("achievements_pkey");

            entity.ToTable("achievements");

            entity.HasIndex(e => e.Code, "achievements_code_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .HasColumnName("code");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IconUrl).HasColumnName("icon_url");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.XpReward)
                .HasDefaultValue(0)
                .HasColumnName("xp_reward");
        });

        modelBuilder.Entity<ChannelMember>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("channel_members_pkey");

            entity.ToTable("channel_members");

            entity.HasIndex(e => new { e.ChannelId, e.UserId }, "channel_members_channel_id_user_id_key").IsUnique();

            entity.HasIndex(e => e.ChannelId, "idx_channel_members_channel");

            entity.HasIndex(e => e.UserId, "idx_channel_members_user");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ChannelId).HasColumnName("channel_id");
            entity.Property(e => e.IsAdmin)
                .HasDefaultValue(false)
                .HasColumnName("is_admin");
            entity.Property(e => e.JoinedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("joined_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Channel).WithMany(p => p.ChannelMembers)
                .HasForeignKey(d => d.ChannelId)
                .HasConstraintName("channel_members_channel_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.ChannelMembers)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("channel_members_user_id_fkey");
        });

        modelBuilder.Entity<CommunityChannel>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("community_channels_pkey");

            entity.ToTable("community_channels");

            entity.HasIndex(e => e.Name, "community_channels_name_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsArchived)
                .HasDefaultValue(false)
                .HasColumnName("is_archived");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.ChannelType).HasColumnName("channel_type");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.CommunityChannels)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("community_channels_created_by_fkey");
        });

        modelBuilder.Entity<CommunityMessage>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("community_messages_pkey");

            entity.ToTable("community_messages");

            entity.HasIndex(e => new { e.ChannelId, e.CreatedAt }, "idx_community_msg_channel").IsDescending(false, true);

            entity.HasIndex(e => e.ParentId, "idx_community_msg_parent");

            entity.HasIndex(e => e.SenderId, "idx_community_msg_sender");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AttachedVocabId).HasColumnName("attached_vocab_id");
            entity.Property(e => e.ChannelId).HasColumnName("channel_id");
            entity.Property(e => e.Content).HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.EditedAt).HasColumnName("edited_at");
            entity.Property(e => e.IsDeleted)
                .HasDefaultValue(false)
                .HasColumnName("is_deleted");
            entity.Property(e => e.IsPinned)
                .HasDefaultValue(false)
                .HasColumnName("is_pinned");
            entity.Property(e => e.ParentId).HasColumnName("parent_id");
            entity.Property(e => e.SenderId).HasColumnName("sender_id");

            entity.HasOne(d => d.AttachedVocab).WithMany(p => p.CommunityMessages)
                .HasForeignKey(d => d.AttachedVocabId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("community_messages_attached_vocab_id_fkey");

            entity.HasOne(d => d.Channel).WithMany(p => p.CommunityMessages)
                .HasForeignKey(d => d.ChannelId)
                .HasConstraintName("community_messages_channel_id_fkey");

            entity.HasOne(d => d.Parent).WithMany(p => p.InverseParent)
                .HasForeignKey(d => d.ParentId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("community_messages_parent_id_fkey");

            entity.HasOne(d => d.Sender).WithMany(p => p.CommunityMessages)
                .HasForeignKey(d => d.SenderId)
                .HasConstraintName("community_messages_sender_id_fkey");
        });

        modelBuilder.Entity<Document>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("documents_pkey");

            entity.ToTable("documents");

            entity.HasIndex(e => e.UserId, "idx_documents_user_id");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.ExtractedText).HasColumnName("extracted_text");
            entity.Property(e => e.FileSizeBytes).HasColumnName("file_size_bytes");
            entity.Property(e => e.FileUrl).HasColumnName("file_url");
            entity.Property(e => e.LanguageDetected)
                .HasMaxLength(10)
                .HasDefaultValueSql("'zh'::character varying")
                .HasColumnName("language_detected");
            entity.Property(e => e.OriginalFilename)
                .HasMaxLength(255)
                .HasColumnName("original_filename");
            entity.Property(e => e.PageCount).HasColumnName("page_count");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.TotalVocabularyCount)
                .HasDefaultValue(0)
                .HasColumnName("total_vocabulary_count");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Documents)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("documents_user_id_fkey");
        });

        modelBuilder.Entity<DocumentPage>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("document_pages_pkey");

            entity.ToTable("document_pages");

            entity.HasIndex(e => new { e.DocumentId, e.PageNumber }, "document_pages_document_id_page_number_key").IsUnique();

            entity.HasIndex(e => e.DocumentId, "idx_doc_pages_document");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Content).HasColumnName("content");
            entity.Property(e => e.DocumentId).HasColumnName("document_id");
            entity.Property(e => e.PageNumber).HasColumnName("page_number");

            entity.HasOne(d => d.Document).WithMany(p => p.DocumentPages)
                .HasForeignKey(d => d.DocumentId)
                .HasConstraintName("document_pages_document_id_fkey");
        });

        modelBuilder.Entity<DocumentReadingProgress>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("document_reading_progress_pkey");

            entity.ToTable("document_reading_progress");

            entity.HasIndex(e => new { e.UserId, e.DocumentId }, "document_reading_progress_user_id_document_id_key").IsUnique();

            entity.HasIndex(e => new { e.UserId, e.LastReadAt }, "idx_doc_read_progress_user");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.DocumentId).HasColumnName("document_id");
            entity.Property(e => e.LastPage)
                .HasDefaultValue(1)
                .HasColumnName("last_page");
            entity.Property(e => e.ProgressPercent)
                .HasPrecision(5, 2)
                .HasDefaultValueSql("0")
                .HasColumnName("progress_percent");
            entity.Property(e => e.ReadingMinutes)
                .HasDefaultValue(0)
                .HasColumnName("reading_minutes");
            entity.Property(e => e.LastReadAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("last_read_at");

            entity.HasOne(d => d.User).WithMany()
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("document_reading_progress_user_id_fkey");

            entity.HasOne(d => d.Document).WithMany()
                .HasForeignKey(d => d.DocumentId)
                .HasConstraintName("document_reading_progress_document_id_fkey");
        });

        modelBuilder.Entity<UserLearningGoal>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("user_learning_goals_pkey");

            entity.ToTable("user_learning_goals");

            entity.HasIndex(e => e.UserId, "user_learning_goals_user_id_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.DailyMinutesGoal)
                .HasDefaultValue(20)
                .HasColumnName("daily_minutes_goal");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.User).WithMany()
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("user_learning_goals_user_id_fkey");
        });

        modelBuilder.Entity<ExampleSentence>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("example_sentences_pkey");

            entity.ToTable("example_sentences");

            entity.HasIndex(e => e.Id, "idx_example_vi_null").HasFilter("(vi_text IS NULL)");

            entity.HasIndex(e => e.VocabularyId, "idx_example_vocab");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.EnText).HasColumnName("en_text");
            entity.Property(e => e.Source)
                .HasMaxLength(20)
                .HasDefaultValueSql("'tatoeba'::character varying")
                .HasColumnName("source");
            entity.Property(e => e.TatoebaId).HasColumnName("tatoeba_id");
            entity.Property(e => e.ViText).HasColumnName("vi_text");
            entity.Property(e => e.VocabularyId).HasColumnName("vocabulary_id");
            entity.Property(e => e.ZhText).HasColumnName("zh_text");

            entity.HasOne(d => d.Vocabulary).WithMany(p => p.ExampleSentencesNavigation)
                .HasForeignKey(d => d.VocabularyId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("example_sentences_vocabulary_id_fkey");
        });

        modelBuilder.Entity<Flashcard>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("flashcards_pkey");

            entity.ToTable("flashcards");

            entity.HasIndex(e => e.UserVocabularyId, "flashcards_user_vocabulary_id_key").IsUnique();

            entity.HasIndex(e => e.UserVocabularyId, "idx_flashcard_user_vocab");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.FlipStatus)
                .HasMaxLength(20)
                .HasDefaultValueSql("'still_learning'::character varying")
                .HasColumnName("flip_status");
            entity.Property(e => e.LastStudiedAt).HasColumnName("last_studied_at");
            entity.Property(e => e.LearnStatus)
                .HasMaxLength(20)
                .HasDefaultValueSql("'not_started'::character varying")
                .HasColumnName("learn_status");
            entity.Property(e => e.UserVocabularyId).HasColumnName("user_vocabulary_id");

            entity.HasOne(d => d.UserVocabulary).WithOne(p => p.Flashcard)
                .HasForeignKey<Flashcard>(d => d.UserVocabularyId)
                .HasConstraintName("flashcards_user_vocabulary_id_fkey");
        });

        modelBuilder.Entity<FlipReview>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("flip_reviews_pkey");

            entity.ToTable("flip_reviews");

            entity.HasIndex(e => e.FlashcardId, "idx_flip_reviews_flashcard");

            entity.HasIndex(e => e.SessionId, "idx_flip_reviews_session");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.FlashcardId).HasColumnName("flashcard_id");
            entity.Property(e => e.ResponseMs).HasColumnName("response_ms");
            entity.Property(e => e.ReviewedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("reviewed_at");
            entity.Property(e => e.SessionId).HasColumnName("session_id");
            entity.Property(e => e.Result).HasColumnName("result");

            entity.HasOne(d => d.Flashcard).WithMany(p => p.FlipReviews)
                .HasForeignKey(d => d.FlashcardId)
                .HasConstraintName("flip_reviews_flashcard_id_fkey");

            entity.HasOne(d => d.Session).WithMany(p => p.FlipReviews)
                .HasForeignKey(d => d.SessionId)
                .HasConstraintName("flip_reviews_session_id_fkey");
        });

        modelBuilder.Entity<LeaderboardSnapshot>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("leaderboard_snapshots_pkey");

            entity.ToTable("leaderboard_snapshots");

            entity.HasIndex(e => e.UserId, "idx_leaderboard_user");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Rank).HasColumnName("rank");
            entity.Property(e => e.SnapshotDate)
                .HasDefaultValueSql("CURRENT_DATE")
                .HasColumnName("snapshot_date");
            entity.Property(e => e.StreakDays).HasColumnName("streak_days");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.WordsMastered).HasColumnName("words_mastered");
            entity.Property(e => e.XpTotal).HasColumnName("xp_total");

            entity.HasOne(d => d.User).WithMany(p => p.LeaderboardSnapshots)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("leaderboard_snapshots_user_id_fkey");
        });

        modelBuilder.Entity<LearnRound>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("learn_rounds_pkey");

            entity.ToTable("learn_rounds");

            entity.HasIndex(e => e.FlashcardId, "idx_learn_rounds_flashcard");

            entity.HasIndex(e => e.SessionId, "idx_learn_rounds_session");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AnsweredAt).HasColumnName("answered_at");
            entity.Property(e => e.CorrectAnswer).HasColumnName("correct_answer");
            entity.Property(e => e.FlashcardId).HasColumnName("flashcard_id");
            entity.Property(e => e.Options)
                .HasColumnType("jsonb")
                .HasColumnName("options");
            entity.Property(e => e.ResponseMs).HasColumnName("response_ms");
            entity.Property(e => e.SessionId).HasColumnName("session_id");
            entity.Property(e => e.UserAnswer).HasColumnName("user_answer");
            entity.Property(e => e.Result).HasColumnName("result");
            entity.Property(e => e.QuestionType).HasColumnName("question_type");

            entity.HasOne(d => d.Flashcard).WithMany(p => p.LearnRounds)
                .HasForeignKey(d => d.FlashcardId)
                .HasConstraintName("learn_rounds_flashcard_id_fkey");

            entity.HasOne(d => d.Session).WithMany(p => p.LearnRounds)
                .HasForeignKey(d => d.SessionId)
                .HasConstraintName("learn_rounds_session_id_fkey");
        });

        modelBuilder.Entity<LearningProgress>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("learning_progress_pkey");

            entity.ToTable("learning_progress");

            entity.HasIndex(e => e.ActivityDate, "idx_progress_date").IsDescending();

            entity.HasIndex(e => new { e.UserId, e.ActivityDate }, "idx_progress_user_date").IsDescending(false, true);

            entity.HasIndex(e => new { e.UserId, e.ActivityDate }, "learning_progress_user_id_activity_date_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ActivityDate)
                .HasDefaultValueSql("CURRENT_DATE")
                .HasColumnName("activity_date");
            entity.Property(e => e.DocumentsRead)
                .HasDefaultValue(0)
                .HasColumnName("documents_read");
            entity.Property(e => e.FlashcardsKnow)
                .HasDefaultValue(0)
                .HasColumnName("flashcards_know");
            entity.Property(e => e.FlashcardsReviewed)
                .HasDefaultValue(0)
                .HasColumnName("flashcards_reviewed");
            entity.Property(e => e.LearnCorrect)
                .HasDefaultValue(0)
                .HasColumnName("learn_correct");
            entity.Property(e => e.LearnRoundsDone)
                .HasDefaultValue(0)
                .HasColumnName("learn_rounds_done");
            entity.Property(e => e.MatchGamesDone)
                .HasDefaultValue(0)
                .HasColumnName("match_games_done");
            entity.Property(e => e.NewWordsSaved)
                .HasDefaultValue(0)
                .HasColumnName("new_words_saved");
            entity.Property(e => e.PagesRead)
                .HasDefaultValue(0)
                .HasColumnName("pages_read");
            entity.Property(e => e.QuizCorrectAnswers)
                .HasDefaultValue(0)
                .HasColumnName("quiz_correct_answers");
            entity.Property(e => e.QuizTotalQuestions)
                .HasDefaultValue(0)
                .HasColumnName("quiz_total_questions");
            entity.Property(e => e.QuizzesCompleted)
                .HasDefaultValue(0)
                .HasColumnName("quizzes_completed");
            entity.Property(e => e.StudyMinutes)
                .HasDefaultValue(0)
                .HasColumnName("study_minutes");
            entity.Property(e => e.StudySessionsDone)
                .HasDefaultValue(0)
                .HasColumnName("study_sessions_done");
            entity.Property(e => e.TotalWordsSaved)
                .HasDefaultValue(0)
                .HasColumnName("total_words_saved");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.WordsClicked)
                .HasDefaultValue(0)
                .HasColumnName("words_clicked");
            entity.Property(e => e.WordsMastered)
                .HasDefaultValue(0)
                .HasColumnName("words_mastered");
            entity.Property(e => e.XpEarned)
                .HasDefaultValue(0)
                .HasColumnName("xp_earned");

            entity.HasOne(d => d.User).WithMany(p => p.LearningProgresses)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("learning_progress_user_id_fkey");
        });

        modelBuilder.Entity<MatchGame>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("match_games_pkey");

            entity.ToTable("match_games");

            entity.HasIndex(e => e.SessionId, "match_games_session_id_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CardCount).HasColumnName("card_count");
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");
            entity.Property(e => e.SessionId).HasColumnName("session_id");
            entity.Property(e => e.TimeSeconds).HasColumnName("time_seconds");

            entity.HasOne(d => d.Session).WithOne(p => p.MatchGame)
                .HasForeignKey<MatchGame>(d => d.SessionId)
                .HasConstraintName("match_games_session_id_fkey");
        });

        modelBuilder.Entity<MatchPair>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("match_pairs_pkey");

            entity.ToTable("match_pairs");

            entity.HasIndex(e => e.MatchGameId, "idx_match_pairs_game");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AttemptCount)
                .HasDefaultValue(0)
                .HasColumnName("attempt_count");
            entity.Property(e => e.FlashcardId).HasColumnName("flashcard_id");
            entity.Property(e => e.MatchGameId).HasColumnName("match_game_id");
            entity.Property(e => e.MatchedAt).HasColumnName("matched_at");

            entity.HasOne(d => d.Flashcard).WithMany(p => p.MatchPairs)
                .HasForeignKey(d => d.FlashcardId)
                .HasConstraintName("match_pairs_flashcard_id_fkey");

            entity.HasOne(d => d.MatchGame).WithMany(p => p.MatchPairs)
                .HasForeignKey(d => d.MatchGameId)
                .HasConstraintName("match_pairs_match_game_id_fkey");
        });

        modelBuilder.Entity<MessageReaction>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("message_reactions_pkey");

            entity.ToTable("message_reactions");

            entity.HasIndex(e => e.MessageId, "idx_reactions_message");

            entity.HasIndex(e => new { e.MessageId, e.UserId, e.Emoji }, "message_reactions_message_id_user_id_emoji_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Emoji)
                .HasMaxLength(10)
                .HasColumnName("emoji");
            entity.Property(e => e.MessageId).HasColumnName("message_id");
            entity.Property(e => e.ReactedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("reacted_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Message).WithMany(p => p.MessageReactions)
                .HasForeignKey(d => d.MessageId)
                .HasConstraintName("message_reactions_message_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.MessageReactions)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("message_reactions_user_id_fkey");
        });

        modelBuilder.Entity<MessageReport>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("message_reports_pkey");

            entity.ToTable("message_reports");

            entity.HasIndex(e => new { e.MessageId, e.ReporterId }, "message_reports_message_id_reporter_id_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.MessageId).HasColumnName("message_id");
            entity.Property(e => e.Reason)
                .HasMaxLength(255)
                .HasColumnName("reason");
            entity.Property(e => e.ReporterId).HasColumnName("reporter_id");
            entity.Property(e => e.ReviewedAt).HasColumnName("reviewed_at");
            entity.Property(e => e.ReviewedBy).HasColumnName("reviewed_by");
            entity.Property(e => e.Status).HasColumnName("status");

            entity.HasOne(d => d.Message).WithMany(p => p.MessageReports)
                .HasForeignKey(d => d.MessageId)
                .HasConstraintName("message_reports_message_id_fkey");

            entity.HasOne(d => d.Reporter).WithMany(p => p.MessageReportReporters)
                .HasForeignKey(d => d.ReporterId)
                .HasConstraintName("message_reports_reporter_id_fkey");

            entity.HasOne(d => d.ReviewedByNavigation).WithMany(p => p.MessageReportReviewedByNavigations)
                .HasForeignKey(d => d.ReviewedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("message_reports_reviewed_by_fkey");
        });

        modelBuilder.Entity<QuizQuestion>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("quiz_questions_pkey");

            entity.ToTable("quiz_questions");

            entity.HasIndex(e => e.SessionId, "idx_quiz_questions_session");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AnsweredAt).HasColumnName("answered_at");
            entity.Property(e => e.CorrectAnswer).HasColumnName("correct_answer");
            entity.Property(e => e.IsCorrect).HasColumnName("is_correct");
            entity.Property(e => e.Options)
                .HasColumnType("jsonb")
                .HasColumnName("options");
            entity.Property(e => e.QuestionText).HasColumnName("question_text");
            entity.Property(e => e.ResponseMs).HasColumnName("response_ms");
            entity.Property(e => e.SessionId).HasColumnName("session_id");
            entity.Property(e => e.UserAnswer).HasColumnName("user_answer");
            entity.Property(e => e.VocabularyId).HasColumnName("vocabulary_id");
            entity.Property(e => e.QuestionType).HasColumnName("question_type");
            entity.Property(e => e.Explanation).HasColumnName("explanation");
            entity.Property(e => e.AiExplanation).HasColumnName("ai_explanation");
            entity.Property(e => e.QuestionOrder).HasColumnName("question_order");
            entity.Property(e => e.Flagged).HasColumnName("flagged");

            entity.HasOne(d => d.Session).WithMany(p => p.QuizQuestions)
                .HasForeignKey(d => d.SessionId)
                .HasConstraintName("quiz_questions_session_id_fkey");

            entity.HasOne(d => d.Vocabulary).WithMany(p => p.QuizQuestions)
                .HasForeignKey(d => d.VocabularyId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("quiz_questions_vocabulary_id_fkey");
        });

        modelBuilder.Entity<QuizReview>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("quiz_reviews_pkey");

            entity.ToTable("quiz_reviews");

            entity.HasIndex(e => e.SessionId, "idx_quiz_reviews_session");
            entity.HasIndex(e => e.VocabularyId, "idx_quiz_reviews_vocab");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.SessionId).HasColumnName("session_id");
            entity.Property(e => e.VocabularyId).HasColumnName("vocabulary_id");
            entity.Property(e => e.ReviewReason)
                .HasMaxLength(50)
                .HasColumnName("review_reason");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");

            entity.HasOne(d => d.Session).WithMany(p => p.QuizReviews)
                .HasForeignKey(d => d.SessionId)
                .HasConstraintName("quiz_reviews_session_id_fkey");

            entity.HasOne(d => d.Vocabulary).WithMany()
                .HasForeignKey(d => d.VocabularyId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("quiz_reviews_vocabulary_id_fkey");
        });

        modelBuilder.Entity<QuizSession>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("quiz_sessions_pkey");

            entity.ToTable("quiz_sessions");

            entity.HasIndex(e => e.UserId, "idx_quiz_sessions_user");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");
            entity.Property(e => e.CorrectAnswers)
                .HasDefaultValue(0)
                .HasColumnName("correct_answers");
            entity.Property(e => e.ScorePercent)
                .ValueGeneratedOnAddOrUpdate()
                .HasColumnName("score_percent");
            entity.Property(e => e.AccuracyPercent)
                .HasPrecision(5, 2)
                .HasColumnName("accuracy_percent");
            entity.Property(e => e.TimeSpentSeconds).HasColumnName("time_spent_seconds");
            entity.Property(e => e.AiFeedback).HasColumnName("ai_feedback");
            entity.Property(e => e.SkillsJson)
                .HasColumnType("jsonb")
                .HasColumnName("skills_json");
            entity.Property(e => e.StartedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("started_at");
            entity.Property(e => e.TotalQuestions).HasColumnName("total_questions");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.Property(e => e.Score).HasColumnName("score");
            entity.Property(e => e.Xp).HasColumnName("xp");
            entity.Property(e => e.XpEarned).HasColumnName("xp_earned");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.Difficulty).HasColumnName("difficulty");
            entity.Property(e => e.QuestionTypes)
                .HasColumnType("jsonb")
                .HasColumnName("question_types");
            entity.Property(e => e.Generator).HasColumnName("generator");

            entity.HasOne(d => d.User).WithMany(p => p.QuizSessions)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("quiz_sessions_user_id_fkey");
        });

        modelBuilder.Entity<StudySession>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("study_sessions_pkey");

            entity.ToTable("study_sessions");

            entity.HasIndex(e => e.UserId, "idx_study_sessions_user");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CardsKnow)
                .HasDefaultValue(0)
                .HasColumnName("cards_know");
            entity.Property(e => e.CardsStillLearning)
                .HasDefaultValue(0)
                .HasColumnName("cards_still_learning");
            entity.Property(e => e.CorrectAnswers)
                .HasDefaultValue(0)
                .HasColumnName("correct_answers");
            entity.Property(e => e.EndedAt).HasColumnName("ended_at");
            entity.Property(e => e.IncorrectAnswers)
                .HasDefaultValue(0)
                .HasColumnName("incorrect_answers");
            entity.Property(e => e.MatchTimeSeconds).HasColumnName("match_time_seconds");
            entity.Property(e => e.ScorePercent)
                .HasPrecision(5, 2)
                .HasComputedColumnSql("\nCASE\n    WHEN ((correct_answers + incorrect_answers) = 0) THEN NULL::numeric\n    ELSE round((((correct_answers)::numeric * 100.0) / ((correct_answers + incorrect_answers))::numeric), 2)\nEND", true)
                .HasColumnName("score_percent");
            entity.Property(e => e.StartedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("started_at");
            entity.Property(e => e.TotalCards)
                .HasDefaultValue(0)
                .HasColumnName("total_cards");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Mode).HasColumnName("mode");

            entity.HasOne(d => d.User).WithMany(p => p.StudySessions)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("study_sessions_user_id_fkey");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("users_pkey");

            entity.ToTable("users");

            entity.HasIndex(e => e.Email, "users_email_key").IsUnique();

            entity.HasIndex(e => e.GoogleId, "users_google_id_key").IsUnique();

            entity.HasIndex(e => e.Username, "users_username_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.DisplayName)
                .HasMaxLength(100)
                .HasColumnName("display_name");
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .HasColumnName("email");
            entity.Property(e => e.GoogleId)
                .HasMaxLength(255)
                .HasColumnName("google_id");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .HasColumnName("username");
        });

        modelBuilder.Entity<UserAchievement>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("user_achievements_pkey");

            entity.ToTable("user_achievements");

            entity.HasIndex(e => e.UserId, "idx_user_achievements_user");

            entity.HasIndex(e => new { e.UserId, e.AchievementId }, "user_achievements_user_id_achievement_id_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AchievementId).HasColumnName("achievement_id");
            entity.Property(e => e.EarnedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("earned_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Achievement).WithMany(p => p.UserAchievements)
                .HasForeignKey(d => d.AchievementId)
                .HasConstraintName("user_achievements_achievement_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.UserAchievements)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("user_achievements_user_id_fkey");
        });

        modelBuilder.Entity<UserStat>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("user_stats_pkey");

            entity.ToTable("user_stats");

            entity.Property(e => e.UserId)
                .ValueGeneratedNever()
                .HasColumnName("user_id");
            entity.Property(e => e.CurrentStreakDays)
                .HasDefaultValue(0)
                .HasColumnName("current_streak_days");
            entity.Property(e => e.LastActiveDate).HasColumnName("last_active_date");
            entity.Property(e => e.LongestStreakDays)
                .HasDefaultValue(0)
                .HasColumnName("longest_streak_days");
            entity.Property(e => e.TotalDocumentsRead)
                .HasDefaultValue(0)
                .HasColumnName("total_documents_read");
            entity.Property(e => e.TotalFlashcardsDone)
                .HasDefaultValue(0)
                .HasColumnName("total_flashcards_done");
            entity.Property(e => e.TotalQuizzesDone)
                .HasDefaultValue(0)
                .HasColumnName("total_quizzes_done");
            entity.Property(e => e.TotalStudyMinutes)
                .HasDefaultValue(0)
                .HasColumnName("total_study_minutes");
            entity.Property(e => e.TotalStudySessions)
                .HasDefaultValue(0)
                .HasColumnName("total_study_sessions");
            entity.Property(e => e.TotalWordsMastered)
                .HasDefaultValue(0)
                .HasColumnName("total_words_mastered");
            entity.Property(e => e.TotalWordsSaved)
                .HasDefaultValue(0)
                .HasColumnName("total_words_saved");
            entity.Property(e => e.TotalXp)
                .HasDefaultValue(0)
                .HasColumnName("total_xp");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.XpThisMonth)
                .HasDefaultValue(0)
                .HasColumnName("xp_this_month");
            entity.Property(e => e.XpThisWeek)
                .HasDefaultValue(0)
                .HasColumnName("xp_this_week");
            entity.Property(e => e.XpToday)
                .HasDefaultValue(0)
                .HasColumnName("xp_today");

            entity.HasOne(d => d.User).WithOne(p => p.UserStat)
                .HasForeignKey<UserStat>(d => d.UserId)
                .HasConstraintName("user_stats_user_id_fkey");
        });

        modelBuilder.Entity<UserVocabulary>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("user_vocabulary_pkey");

            entity.ToTable("user_vocabulary");

            entity.HasIndex(e => e.UserId, "idx_uservocab_user");

            entity.HasIndex(e => e.VocabularyId, "idx_uservocab_vocab");

            entity.HasIndex(e => new { e.UserId, e.VocabularyId }, "user_vocabulary_user_id_vocabulary_id_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.IsMastered)
                .HasDefaultValue(false)
                .HasColumnName("is_mastered");
            entity.Property(e => e.PersonalNote).HasColumnName("personal_note");
            entity.Property(e => e.SavedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("saved_at");
            entity.Property(e => e.SourceDocumentId).HasColumnName("source_document_id");
            entity.Property(e => e.SourcePage).HasColumnName("source_page");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.VocabularyId).HasColumnName("vocabulary_id");
            entity.Property(e => e.CorrectCount).HasColumnName("correct_count");
            entity.Property(e => e.WrongCount).HasColumnName("wrong_count");
            entity.Property(e => e.MasteryLevel).HasColumnName("mastery_level");
            entity.Property(e => e.LastReviewed).HasColumnName("last_reviewed");

            entity.HasOne(d => d.SourceDocument).WithMany(p => p.UserVocabularies)
                .HasForeignKey(d => d.SourceDocumentId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("user_vocabulary_source_document_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.UserVocabularies)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("user_vocabulary_user_id_fkey");

            entity.HasOne(d => d.Vocabulary).WithMany(p => p.UserVocabularies)
                .HasForeignKey(d => d.VocabularyId)
                .HasConstraintName("user_vocabulary_vocabulary_id_fkey");
        });

        modelBuilder.Entity<Vocabulary>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("vocabulary_pkey");

            entity.ToTable("vocabulary");

            entity.HasIndex(e => e.Word, "idx_vocab_word");

            entity.HasIndex(e => e.Word, "vocabulary_word_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.Definitions)
                .HasColumnType("jsonb")
                .HasColumnName("definitions");
            entity.Property(e => e.ExampleSentences)
                .HasColumnType("jsonb")
                .HasColumnName("example_sentences");
            entity.Property(e => e.Pinyin)
                .HasMaxLength(255)
                .HasColumnName("pinyin");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("updated_at");
            entity.Property(e => e.UsageNotes).HasColumnName("usage_notes");
            entity.Property(e => e.ViTranslated)
                .HasDefaultValue(false)
                .HasColumnName("vi_translated");
            entity.Property(e => e.Word)
                .HasMaxLength(255)
                .HasColumnName("word");
            entity.Property(e => e.WordType).HasColumnName("word_type");
        });

        modelBuilder.Entity<VwLeaderboardAllTime>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_leaderboard_all_time");

            entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url");
            entity.Property(e => e.CurrentStreakDays).HasColumnName("current_streak_days");
            entity.Property(e => e.DisplayName)
                .HasMaxLength(100)
                .HasColumnName("display_name");
            entity.Property(e => e.LastActiveDate).HasColumnName("last_active_date");
            entity.Property(e => e.LongestStreakDays).HasColumnName("longest_streak_days");
            entity.Property(e => e.Rank).HasColumnName("rank");
            entity.Property(e => e.TotalWordsMastered).HasColumnName("total_words_mastered");
            entity.Property(e => e.TotalXp).HasColumnName("total_xp");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .HasColumnName("username");
        });

        modelBuilder.Entity<VwLeaderboardDaily>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_leaderboard_daily");

            entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url");
            entity.Property(e => e.CurrentStreakDays).HasColumnName("current_streak_days");
            entity.Property(e => e.DisplayName)
                .HasMaxLength(100)
                .HasColumnName("display_name");
            entity.Property(e => e.Rank).HasColumnName("rank");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .HasColumnName("username");
            entity.Property(e => e.Xp).HasColumnName("xp");
        });

        modelBuilder.Entity<VwLeaderboardWeekly>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_leaderboard_weekly");

            entity.Property(e => e.AvatarUrl).HasColumnName("avatar_url");
            entity.Property(e => e.CurrentStreakDays).HasColumnName("current_streak_days");
            entity.Property(e => e.DisplayName)
                .HasMaxLength(100)
                .HasColumnName("display_name");
            entity.Property(e => e.Rank).HasColumnName("rank");
            entity.Property(e => e.TotalWordsMastered).HasColumnName("total_words_mastered");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .HasColumnName("username");
            entity.Property(e => e.Xp).HasColumnName("xp");
        });

        modelBuilder.Entity<VwUserDashboard>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_user_dashboard");

            entity.Property(e => e.CurrentStreakDays).HasColumnName("current_streak_days");
            entity.Property(e => e.DisplayName)
                .HasMaxLength(100)
                .HasColumnName("display_name");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Last7Days)
                .HasColumnType("json")
                .HasColumnName("last_7_days");
            entity.Property(e => e.LastActiveDate).HasColumnName("last_active_date");
            entity.Property(e => e.LongestStreakDays).HasColumnName("longest_streak_days");
            entity.Property(e => e.TotalDocumentsRead).HasColumnName("total_documents_read");
            entity.Property(e => e.TotalFlashcardsDone).HasColumnName("total_flashcards_done");
            entity.Property(e => e.TotalQuizzesDone).HasColumnName("total_quizzes_done");
            entity.Property(e => e.TotalStudySessions).HasColumnName("total_study_sessions");
            entity.Property(e => e.TotalWordsMastered).HasColumnName("total_words_mastered");
            entity.Property(e => e.TotalWordsSaved).HasColumnName("total_words_saved");
            entity.Property(e => e.TotalXp).HasColumnName("total_xp");
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .HasColumnName("username");
            entity.Property(e => e.XpThisWeek).HasColumnName("xp_this_week");
            entity.Property(e => e.XpToday).HasColumnName("xp_today");
        });

        modelBuilder.Entity<WordRelation>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("word_relations_pkey");

            entity.ToTable("word_relations");

            entity.HasIndex(e => e.RelatedId, "idx_word_relations_related");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("created_at");
            entity.Property(e => e.RelatedId).HasColumnName("related_id");
            entity.Property(e => e.Source)
                .HasMaxLength(20)
                .HasDefaultValueSql("'deepseek'::character varying")
                .HasColumnName("source");
            entity.Property(e => e.VocabId).HasColumnName("vocab_id");
            entity.Property(e => e.RelationType).HasColumnName("relation_type");

            entity.HasOne(d => d.Related).WithMany(p => p.WordRelationRelateds)
                .HasForeignKey(d => d.RelatedId)
                .HasConstraintName("word_relations_related_id_fkey");

            entity.HasOne(d => d.Vocab).WithMany(p => p.WordRelationVocabs)
                .HasForeignKey(d => d.VocabId)
                .HasConstraintName("word_relations_vocab_id_fkey");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
