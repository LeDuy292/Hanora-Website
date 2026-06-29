using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class FlashcardDeck
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public string Name { get; set; } = null!;

    public string? Source { get; set; }

    public string? Description { get; set; }

    public long? DocumentId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;

    public virtual Document? Document { get; set; }

    public virtual ICollection<Flashcard> Flashcards { get; set; } = new List<Flashcard>();
}
