using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class Flashcard
{
    public long Id { get; set; }

    public long UserVocabularyId { get; set; }

    public string? FlipStatus { get; set; }

    public string? LearnStatus { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? LastStudiedAt { get; set; }

    public long? DeckId { get; set; }

    public virtual ICollection<FlipReview> FlipReviews { get; set; } = new List<FlipReview>();

    public virtual ICollection<LearnRound> LearnRounds { get; set; } = new List<LearnRound>();

    public virtual ICollection<MatchPair> MatchPairs { get; set; } = new List<MatchPair>();

    public virtual UserVocabulary UserVocabulary { get; set; } = null!;

    public virtual FlashcardDeck? Deck { get; set; }
}
