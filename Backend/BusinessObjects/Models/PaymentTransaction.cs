using System;

namespace BusinessObjects.Models;

public partial class PaymentTransaction
{
    public long OrderCode { get; set; }

    public long? UserId { get; set; }

    public string PlanId { get; set; } = null!;

    public int Amount { get; set; }

    public string? Description { get; set; }

    public string Status { get; set; } = "PENDING";

    public string? PaymentLinkId { get; set; }

    public string? CheckoutUrl { get; set; }

    public string? QrCode { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? PaidAt { get; set; }

    public virtual User? User { get; set; }
}
