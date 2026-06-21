using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class MessageReaction
{
    public long Id { get; set; }

    public long MessageId { get; set; }

    public long UserId { get; set; }

    public string Emoji { get; set; } = null!;

    public DateTime? ReactedAt { get; set; }

    public virtual CommunityMessage Message { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
