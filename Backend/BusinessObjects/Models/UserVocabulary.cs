using System.ComponentModel.DataAnnotations.Schema;

namespace BusinessObjects.Models
{
    [Table("user_vocabulary")]
    public class UserVocabulary
    {
        [Column("id")]
        public long Id { get; set; }

        [Column("user_id")]
        public long UserId { get; set; }

        [Column("vocabulary_id")]
        public long VocabularyId { get; set; }

        [Column("source_document_id")]
        public long? SourceDocumentId { get; set; }

        [Column("source_page")]
        public int? SourcePage { get; set; }

        [Column("personal_note")]
        public string? PersonalNote { get; set; }

        [Column("is_mastered")]
        public bool IsMastered { get; set; } = false;

        [Column("saved_at")]
        public DateTime SavedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [ForeignKey("VocabularyId")]
        public virtual Vocabulary? Vocabulary { get; set; }
    }
}
