using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class DocumentReadingProgress
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public long DocumentId { get; set; }

    public int? LastPage { get; set; }

    public decimal? ProgressPercent { get; set; }

    public int? ReadingMinutes { get; set; }

    public DateTime? LastReadAt { get; set; }

    public virtual User User { get; set; } = null!;

    public virtual Document Document { get; set; } = null!;
}
