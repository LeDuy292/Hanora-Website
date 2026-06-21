using System.ComponentModel.DataAnnotations.Schema;

namespace BusinessObjects.Models
{
    [Table("flashcards")]
    public class Flashcard
    {
        [Column("id")]
        public long Id { get; set; }

        [Column("user_vocabulary_id")]
        public long UserVocabularyId { get; set; }

        [Column("flip_status")]
        public string FlipStatus { get; set; } = "still_learning";

        [Column("learn_status")]
        public string LearnStatus { get; set; } = "not_started";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("last_studied_at")]
        public DateTime? LastStudiedAt { get; set; }

        [ForeignKey("UserVocabularyId")]
        public virtual UserVocabulary? UserVocabulary { get; set; }
    }
}
