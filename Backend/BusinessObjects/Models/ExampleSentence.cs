using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class ExampleSentence
{
    public long Id { get; set; }

    public long? VocabularyId { get; set; }

    public string ZhText { get; set; } = null!;

    public string? ViText { get; set; }

    public string? EnText { get; set; }

    public string? Source { get; set; }

    public long? TatoebaId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Vocabulary? Vocabulary { get; set; }
}
