using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class MessageReport
{
    public long Id { get; set; }

    public long MessageId { get; set; }

    public long ReporterId { get; set; }

    public string Reason { get; set; } = null!;

    public ReportStatus? Status { get; set; }

    public long? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual CommunityMessage Message { get; set; } = null!;

    public virtual User Reporter { get; set; } = null!;

    public virtual User? ReviewedByNavigation { get; set; }
}
