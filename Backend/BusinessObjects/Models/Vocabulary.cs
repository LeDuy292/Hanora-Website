using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class Vocabulary
{
    public long Id { get; set; }

    public string Word { get; set; } = null!;

    public string Pinyin { get; set; } = null!;

    public string Definitions { get; set; } = null!;

    public string? ExampleSentences { get; set; }

    public string? UsageNotes { get; set; }

    public string? HanViet { get; set; }

    public string? Collocations { get; set; }

    public string? GrammarPatterns { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public bool? ViTranslated { get; set; }

    public WordType? WordType { get; set; }

    public virtual ICollection<CommunityMessage> CommunityMessages { get; set; } = new List<CommunityMessage>();

    public virtual ICollection<ExampleSentence> ExampleSentencesNavigation { get; set; } = new List<ExampleSentence>();

    public virtual ICollection<QuizQuestion> QuizQuestions { get; set; } = new List<QuizQuestion>();

    public virtual ICollection<UserVocabulary> UserVocabularies { get; set; } = new List<UserVocabulary>();

    public virtual ICollection<WordRelation> WordRelationRelateds { get; set; } = new List<WordRelation>();

    public virtual ICollection<WordRelation> WordRelationVocabs { get; set; } = new List<WordRelation>();
}
