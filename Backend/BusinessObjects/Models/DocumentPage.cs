using System;
using System.Collections.Generic;

namespace BusinessObjects.Models;

public partial class DocumentPage
{
    public long Id { get; set; }

    public long DocumentId { get; set; }

    public int PageNumber { get; set; }

    public string Content { get; set; } = null!;

    public virtual Document Document { get; set; } = null!;
}
