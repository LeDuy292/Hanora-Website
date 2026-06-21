using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class WordRelation
{
    public long Id { get; set; }

    public long VocabId { get; set; }

    public long RelatedId { get; set; }

    public RelationType? RelationType { get; set; }

    public string? Source { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Vocabulary Related { get; set; } = null!;

    public virtual Vocabulary Vocab { get; set; } = null!;
}
