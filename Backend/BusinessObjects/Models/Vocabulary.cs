using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BusinessObjects.Models
{
    [Table("vocabulary")]
    public class Vocabulary
    {
        [Column("id")]
        public long Id { get; set; }

        [Required, MaxLength(50), Column("word")]
        public string Word { get; set; } = string.Empty;

        [Required, MaxLength(100), Column("pinyin")]
        public string Pinyin { get; set; } = string.Empty;

        [Column("word_type")]
        public string? WordType { get; set; }

        [Required, Column("definitions", TypeName = "jsonb")]
        public string Definitions { get; set; } = "[]";

        [Column("example_sentences", TypeName = "jsonb")]
        public string? ExampleSentences { get; set; }

        [Column("usage_notes")]
        public string? UsageNotes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
