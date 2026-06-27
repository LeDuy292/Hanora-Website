using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class User
{
    public long Id { get; set; }

    public string Username { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string? DisplayName { get; set; }

    public string? AvatarUrl { get; set; }

    public bool? IsActive { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string? GoogleId { get; set; }

    public virtual ICollection<ChannelMember> ChannelMembers { get; set; } = new List<ChannelMember>();

    public virtual ICollection<CommunityChannel> CommunityChannels { get; set; } = new List<CommunityChannel>();

    public virtual ICollection<CommunityMessage> CommunityMessages { get; set; } = new List<CommunityMessage>();

    public virtual ICollection<Document> Documents { get; set; } = new List<Document>();

    public virtual ICollection<LeaderboardSnapshot> LeaderboardSnapshots { get; set; } = new List<LeaderboardSnapshot>();

    public virtual ICollection<LearningProgress> LearningProgresses { get; set; } = new List<LearningProgress>();

    public virtual ICollection<MessageReaction> MessageReactions { get; set; } = new List<MessageReaction>();

    public virtual ICollection<MessageReport> MessageReportReporters { get; set; } = new List<MessageReport>();

    public virtual ICollection<MessageReport> MessageReportReviewedByNavigations { get; set; } = new List<MessageReport>();

    public virtual ICollection<QuizSession> QuizSessions { get; set; } = new List<QuizSession>();

    public virtual ICollection<StudySession> StudySessions { get; set; } = new List<StudySession>();

    public virtual ICollection<UserAchievement> UserAchievements { get; set; } = new List<UserAchievement>();

    public virtual UserStat? UserStat { get; set; }

    public virtual ICollection<UserVocabulary> UserVocabularies { get; set; } = new List<UserVocabulary>();

    public virtual ICollection<FlashcardDeck> FlashcardDecks { get; set; } = new List<FlashcardDeck>();

    public virtual ICollection<UserNotification> UserNotifications { get; set; } = new List<UserNotification>();

    public virtual ICollection<LeaderboardReward> LeaderboardRewards { get; set; } = new List<LeaderboardReward>();
}
