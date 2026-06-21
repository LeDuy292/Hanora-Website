using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class CommunityMessage
{
    public long Id { get; set; }

    public long ChannelId { get; set; }

    public long SenderId { get; set; }

    public long? ParentId { get; set; }

    public string Content { get; set; } = null!;

    public long? AttachedVocabId { get; set; }

    public bool? IsPinned { get; set; }

    public bool? IsDeleted { get; set; }

    public DateTime? EditedAt { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Vocabulary? AttachedVocab { get; set; }

    public virtual CommunityChannel Channel { get; set; } = null!;

    public virtual ICollection<CommunityMessage> InverseParent { get; set; } = new List<CommunityMessage>();

    public virtual ICollection<MessageReaction> MessageReactions { get; set; } = new List<MessageReaction>();

    public virtual ICollection<MessageReport> MessageReports { get; set; } = new List<MessageReport>();

    public virtual CommunityMessage? Parent { get; set; }

    public virtual User Sender { get; set; } = null!;
}
