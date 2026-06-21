using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class MatchGame
{
    public long Id { get; set; }

    public long SessionId { get; set; }

    public int CardCount { get; set; }

    public int? TimeSeconds { get; set; }

    public DateTime? CompletedAt { get; set; }

    public virtual ICollection<MatchPair> MatchPairs { get; set; } = new List<MatchPair>();

    public virtual StudySession Session { get; set; } = null!;
}
