using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services;

namespace Hanora.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentService _paymentService;

        public PaymentController(IPaymentService paymentService)
        {
            _paymentService = paymentService;
        }

        [HttpGet("packages")]
        public IActionResult GetPackages()
        {
            var packages = _paymentService.GetPackages();
            return Ok(packages);
        }

        [HttpPost("create-payment-link")]
        public async Task<IActionResult> CreatePaymentLink([FromBody] CreatePaymentLinkDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.PlanId))
            {
                return BadRequest(new { error = "Vui lòng chọn gói dịch vụ." });
            }

            long? userId = null;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && long.TryParse(userIdClaim.Value, out var uid))
            {
                userId = uid;
            }

            var origin = Request.Headers["Origin"].ToString();
            if (string.IsNullOrWhiteSpace(origin))
            {
                origin = Request.Headers["Referer"].ToString();
            }

            var result = await _paymentService.CreatePaymentLinkAsync(userId, dto, origin);

            if (!result.Success)
            {
                return BadRequest(new { error = result.Error ?? "Không thể tạo liên kết thanh toán." });
            }

            return Ok(result);
        }

        [HttpGet("order/{orderCode:long}")]
        public async Task<IActionResult> GetOrderStatus(long orderCode)
        {
            var status = await _paymentService.GetPaymentStatusAsync(orderCode);
            if (status == null)
            {
                return NotFound(new { error = "Không tìm thấy đơn hàng thanh toán." });
            }

            return Ok(status);
        }

        [HttpPost("webhook")]
        public async Task<IActionResult> HandleWebhook([FromBody] JsonElement body)
        {
            var success = await _paymentService.ProcessWebhookAsync(body);
            return Ok(new { success });
        }

        [Authorize]
        [HttpGet("history")]
        public async Task<IActionResult> GetHistory()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized();
            }

            var list = await _paymentService.GetUserTransactionsAsync(userId);
            return Ok(list);
        }
    }
}
