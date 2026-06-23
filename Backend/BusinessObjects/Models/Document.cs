using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class Document
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public string Title { get; set; } = null!;

    public string OriginalFilename { get; set; } = null!;

    public string FileUrl { get; set; } = null!;

    public long? FileSizeBytes { get; set; }

    public int? PageCount { get; set; }

    public string? ExtractedText { get; set; }

    public string? LanguageDetected { get; set; }

    public DocumentStatus? Status { get; set; }

    public int? TotalVocabularyCount { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<DocumentPage> DocumentPages { get; set; } = new List<DocumentPage>();

    public virtual User User { get; set; } = null!;

    public virtual ICollection<UserVocabulary> UserVocabularies { get; set; } = new List<UserVocabulary>();
}
