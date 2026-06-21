using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class ChannelMember
{
    public long Id { get; set; }

    public long ChannelId { get; set; }

    public long UserId { get; set; }

    public bool? IsAdmin { get; set; }

    public DateTime? JoinedAt { get; set; }

    public virtual CommunityChannel Channel { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
