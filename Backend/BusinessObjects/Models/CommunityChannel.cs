using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class CommunityChannel
{
    public long Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public ChannelType? ChannelType { get; set; }

    public long CreatedBy { get; set; }

    public bool? IsArchived { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual ICollection<ChannelMember> ChannelMembers { get; set; } = new List<ChannelMember>();

    public virtual ICollection<CommunityMessage> CommunityMessages { get; set; } = new List<CommunityMessage>();

    public virtual User CreatedByNavigation { get; set; } = null!;
}
