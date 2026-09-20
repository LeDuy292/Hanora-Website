using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading.Tasks;
using BusinessObjects.Models;
using DataAccessObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PayOS;
using PayOS.Models.V2.PaymentRequests;
using AppPaymentTransaction = BusinessObjects.Models.PaymentTransaction;

namespace Services
{
    public class PaymentService : IPaymentService
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;
        private readonly ILogger<PaymentService> _logger;
        private readonly PayOSClient _payOSClient;
        private static bool _tableEnsured = false;
        private static readonly object _lock = new();

        public PaymentService(AppDbContext db, IConfiguration config, ILogger<PaymentService> logger)
        {
            _db = db;
            _config = config;
            _logger = logger;

            var clientId = _config["PayOS:ClientId"] ?? "58dcc779-3a75-4563-83ee-20d4c9aed97d";
            var apiKey = _config["PayOS:ApiKey"] ?? "e6b9cff6-ee2c-4e75-bf79-1a85b22ed389";
            var checksumKey = _config["PayOS:ChecksumKey"] ?? "2f25d0cdd5cfb7aacf02eb5752dc7a927274c78396e4a6233285f77be092a3af";

            _payOSClient = new PayOSClient(clientId, apiKey, checksumKey);

            EnsureTableCreated();
        }

        private void EnsureTableCreated()
        {
            if (_tableEnsured) return;
            lock (_lock)
            {
                if (_tableEnsured) return;
                try
                {
                    var sql = @"
                        CREATE TABLE IF NOT EXISTS payment_transactions (
                            order_code BIGINT PRIMARY KEY,
                            user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
                            plan_id VARCHAR(50) NOT NULL,
                            amount INT NOT NULL,
                            description VARCHAR(255),
                            status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
                            payment_link_id VARCHAR(100),
                            checkout_url TEXT,
                            qr_code TEXT,
                            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            paid_at TIMESTAMPTZ
                        );
                        CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
                        CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
                    ";
                    _db.Database.ExecuteSqlRaw(sql);
                    _tableEnsured = true;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not ensure payment_transactions table (may already exist or insufficient permissions).");
                    _tableEnsured = true;
                }
            }
        }

        public List<SubscriptionPackage> GetPackages()
        {
            return new List<SubscriptionPackage>
            {
                new(
                    Id: "basic",
                    Name: "Gói Cơ Bản",
                    Price: 0,
                    FormattedPrice: "0đ",
                    DurationText: "/tháng",
                    Description: "Phù hợp cho các bạn mới bắt đầu làm quen với việc đọc tiếng Trung.",
                    IsHot: false,
                    Badge: null,
                    Features: new List<string>
                    {
                        "Tra từ Hán, Pinyin, nghĩa và cấp độ HSK",
                        "Đọc và phân tích tối đa 3 tài liệu/tháng",
                        "Lưu từ mới vào bộ thẻ cá nhân",
                        "Ôn từ vựng bằng flashcard SRS"
                    }
                ),
                new(
                    Id: "monthly",
                    Name: "Gói Tháng",
                    Price: 59000,
                    FormattedPrice: "59.000đ",
                    DurationText: "/tháng",
                    Description: "Mở khóa toàn bộ tính năng cao cấp và sử dụng không giới hạn trong 1 tháng.",
                    IsHot: true,
                    Badge: "Hot",
                    Features: new List<string>
                    {
                        "Đọc và phân tích tài liệu không giới hạn",
                        "Tra từ Hán, Pinyin, nghĩa và cấp độ HSK 1-6 & 7-9",
                        "AI dịch câu và giải thích ngữ pháp theo ngữ cảnh",
                        "Lưu từ mới và ôn tập flashcard SRS không giới hạn",
                        "Luyện phát âm với chấm điểm và phản hồi từ AI",
                        "Hỗ trợ ưu tiên 24/7"
                    }
                ),
                new(
                    Id: "yearly",
                    Name: "Gói Năm",
                    Price: 599000,
                    FormattedPrice: "599.000đ",
                    DurationText: "/năm",
                    Description: "Mở khóa toàn bộ tính năng và sử dụng không giới hạn trong 1 năm (Tiết kiệm 15%).",
                    IsHot: false,
                    Badge: "Tiết kiệm 15%",
                    Features: new List<string>
                    {
                        "Toàn bộ đặc quyền của Gói Tháng",
                        "Tiết kiệm chi phí so với trả theo tháng",
                        "Không giới hạn tài liệu đọc và phân tích AI",
                        "Truy cập sớm các tính năng AI luyện thi HSK mới",
                        "Hỗ trợ học tập 1-1 qua cộng đồng Hanora VIP"
                    }
                )
            };
        }

        public async Task<PaymentLinkResult> CreatePaymentLinkAsync(long? userId, CreatePaymentLinkDto dto, string? frontendOrigin)
        {
            var packages = GetPackages();
            var targetPackage = packages.Find(p => p.Id.Equals(dto.PlanId, StringComparison.OrdinalIgnoreCase));

            if (targetPackage == null || targetPackage.Price <= 0)
            {
                return new PaymentLinkResult(false, 0, null, null, 0, dto.PlanId, "Gói dịch vụ không hợp lệ hoặc miễn phí.");
            }

            // Generate a unique numeric orderCode for PayOS (under 9007199254740991)
            // Using timestamp seconds + 3 random digits: e.g. 1774093845123 (13 digits)
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var randomSuffix = RandomNumberGenerator.GetInt32(100, 999);
            var orderCode = (timestamp % 100000000) * 1000 + randomSuffix;

            var baseOrigin = !string.IsNullOrWhiteSpace(frontendOrigin)
                ? frontendOrigin.TrimEnd('/')
                : "http://localhost:5173";

            var returnUrl = !string.IsNullOrWhiteSpace(dto.ReturnUrl)
                ? dto.ReturnUrl
                : $"{baseOrigin}/payment/success?orderCode={orderCode}&plan={targetPackage.Id}";

            var cancelUrl = !string.IsNullOrWhiteSpace(dto.CancelUrl)
                ? dto.CancelUrl
                : $"{baseOrigin}/payment/cancel?orderCode={orderCode}&plan={targetPackage.Id}";

            // PayOS description: max 25 characters, alphanumeric & spaces
            var description = $"HANORA {orderCode}".Length > 25 
                ? $"HANORA {orderCode}"[..25] 
                : $"HANORA {orderCode}";

            try
            {
                var paymentRequest = new CreatePaymentLinkRequest
                {
                    OrderCode = orderCode,
                    Amount = targetPackage.Price,
                    Description = description,
                    ReturnUrl = returnUrl,
                    CancelUrl = cancelUrl
                };

                var createResult = await _payOSClient.PaymentRequests.CreateAsync(paymentRequest);

                var transaction = new AppPaymentTransaction
                {
                    OrderCode = orderCode,
                    UserId = userId,
                    PlanId = targetPackage.Id,
                    Amount = targetPackage.Price,
                    Description = description,
                    Status = "PENDING",
                    PaymentLinkId = createResult.PaymentLinkId,
                    CheckoutUrl = createResult.CheckoutUrl,
                    QrCode = createResult.QrCode,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _db.PaymentTransactions.Add(transaction);
                await _db.SaveChangesAsync();

                return new PaymentLinkResult(
                    Success: true,
                    OrderCode: orderCode,
                    CheckoutUrl: createResult.CheckoutUrl,
                    QrCode: createResult.QrCode,
                    Amount: targetPackage.Price,
                    PlanId: targetPackage.Id,
                    Error: null
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create PayOS payment link for orderCode {OrderCode}", orderCode);
                return new PaymentLinkResult(false, orderCode, null, null, targetPackage.Price, targetPackage.Id, ex.Message);
            }
        }

        public async Task<PaymentStatusResult?> GetPaymentStatusAsync(long orderCode)
        {
            var transaction = await _db.PaymentTransactions.FirstOrDefaultAsync(t => t.OrderCode == orderCode);

            // Fetch live status from PayOS
            string payOsStatus = transaction?.Status ?? "PENDING";
            try
            {
                var paymentInfo = await _payOSClient.PaymentRequests.GetAsync(orderCode);
                if (paymentInfo != null)
                {
                    payOsStatus = paymentInfo.Status.ToString();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not fetch real-time PayOS status for orderCode {OrderCode}", orderCode);
            }

            var isPaid = payOsStatus.Equals("PAID", StringComparison.OrdinalIgnoreCase);
            var isProActivated = false;

            if (transaction != null)
            {
                if (isPaid && transaction.Status != "PAID")
                {
                    transaction.Status = "PAID";
                    transaction.PaidAt = DateTime.UtcNow;
                    transaction.UpdatedAt = DateTime.UtcNow;

                    if (transaction.UserId.HasValue)
                    {
                        var user = await _db.Users.FindAsync(transaction.UserId.Value);
                        if (user != null && user.Role != "Admin")
                        {
                            user.Role = "Pro";
                            isProActivated = true;
                        }
                    }

                    await _db.SaveChangesAsync();
                }
                else if (transaction.Status == "PAID")
                {
                    isProActivated = true;
                }

                return new PaymentStatusResult(
                    OrderCode: transaction.OrderCode,
                    Status: transaction.Status,
                    Amount: transaction.Amount,
                    PlanId: transaction.PlanId,
                    PaidAt: transaction.PaidAt,
                    IsProActivated: isProActivated
                );
            }

            return new PaymentStatusResult(
                OrderCode: orderCode,
                Status: payOsStatus,
                Amount: 0,
                PlanId: "monthly",
                PaidAt: isPaid ? DateTime.UtcNow : null,
                IsProActivated: isPaid
            );
        }

        public async Task<bool> ProcessWebhookAsync(JsonElement webhookData)
        {
            try
            {
                if (webhookData.TryGetProperty("data", out var dataProp))
                {
                    if (dataProp.TryGetProperty("orderCode", out var orderCodeProp))
                    {
                        var orderCode = orderCodeProp.GetInt64();
                        var statusResult = await GetPaymentStatusAsync(orderCode);
                        return statusResult?.Status == "PAID";
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing PayOS webhook");
            }
            return false;
        }

        public async Task<List<AppPaymentTransaction>> GetUserTransactionsAsync(long userId)
        {
            return await _db.PaymentTransactions
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();
        }
    }
}
