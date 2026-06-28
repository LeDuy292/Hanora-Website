using System;

namespace BusinessObjects.Models;

public partial class ChatMessage
{
    public long Id { get; set; }

    public long SessionId { get; set; }

    public string Role { get; set; } = null!;

    public string Content { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }

    public virtual ChatSession Session { get; set; } = null!;
}
