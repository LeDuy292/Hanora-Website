using System;

namespace BusinessObjects.Models;

public partial class UserNotification
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public string Title { get; set; } = null!;

    public string Message { get; set; } = null!;

    public bool IsRead { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
