using System.Text.Json;
using BusinessObjects.Models;

namespace Services
{
    public record SubscriptionPackage(
        string Id,
        string Name,
        int Price,
        string FormattedPrice,
        string DurationText,
        string Description,
        bool IsHot,
        string? Badge,
        List<string> Features
    );

    public record CreatePaymentLinkDto(
        string PlanId,
        string? ReturnUrl,
        string? CancelUrl
    );

    public record PaymentLinkResult(
        bool Success,
        long OrderCode,
        string? CheckoutUrl,
        string? QrCode,
        int Amount,
        string PlanId,
        string? Error
    );

    public record PaymentStatusResult(
        long OrderCode,
        string Status,
        int Amount,
        string PlanId,
        DateTime? PaidAt,
        bool IsProActivated
    );

    public interface IPaymentService
    {
        List<SubscriptionPackage> GetPackages();
        Task<PaymentLinkResult> CreatePaymentLinkAsync(long? userId, CreatePaymentLinkDto dto, string? frontendOrigin);
        Task<PaymentStatusResult?> GetPaymentStatusAsync(long orderCode);
        Task<bool> ProcessWebhookAsync(JsonElement webhookData);
        Task<List<PaymentTransaction>> GetUserTransactionsAsync(long userId);
    }
}
