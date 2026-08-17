using BusinessObjects.Models;
using DataAccessObjects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Hanora.Controllers
{
    [ApiController]
    [Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AdminController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet("overview")]
        public async Task<ActionResult<AdminOverviewDto>> GetOverview()
        {
            var since = DateTime.UtcNow.AddDays(-7);
            var trendStart = DateTime.UtcNow.Date.AddDays(-29);

            var totalStudyMinutes = await _db.UserStats.SumAsync(s => s.TotalStudyMinutes ?? 0);
            var totalXp = await _db.UserStats.SumAsync(s => s.TotalXp ?? 0);

            var stats = new AdminOverviewStatsDto(
                TotalUsers: await _db.Users.CountAsync(),
                ActiveUsers: await _db.Users.CountAsync(u => u.IsActive != false),
                AdminUsers: await _db.Users.CountAsync(u => u.Role == "Admin"),
                NewUsers7d: await _db.Users.CountAsync(u => u.CreatedAt >= since),
                TotalDocuments: await _db.Documents.CountAsync(),
                Documents7d: await _db.Documents.CountAsync(d => d.CreatedAt >= since),
                ProcessingDocuments: await _db.Documents.CountAsync(d => d.Status == DocumentStatus.Processing),
                FailedDocuments: await _db.Documents.CountAsync(d => d.Status == DocumentStatus.Failed),
                TotalVocabulary: await _db.Vocabularies.CountAsync(),
                VietnameseReadyVocabulary: await _db.Vocabularies.CountAsync(v => v.ViTranslated == true),
                CommunityMessages: await _db.CommunityMessages.CountAsync(m => m.IsDeleted != true),
                PendingReports: await _db.MessageReports.CountAsync(r => r.Status == ReportStatus.Pending),
                TotalStudyMinutes: totalStudyMinutes,
                TotalXp: totalXp
            );

            var topUsers = await _db.Users
                .AsNoTracking()
                .OrderByDescending(u => u.UserStat != null ? u.UserStat.TotalXp ?? 0 : 0)
                .Take(8)
                .Select(u => new AdminUserRowDto(
                    u.Id,
                    u.Username,
                    u.Email,
                    u.DisplayName,
                    u.Role,
                    u.IsActive ?? true,
                    u.CreatedAt,
                    u.UserStat != null ? u.UserStat.TotalXp ?? 0 : 0,
                    u.UserStat != null ? u.UserStat.CurrentStreakDays ?? 0 : 0,
                    u.UserStat != null ? u.UserStat.TotalStudyMinutes ?? 0 : 0,
                    u.Documents.Count,
                    u.UserVocabularies.Count
                ))
                .ToListAsync();

            var recentDocuments = await _db.Documents
                .AsNoTracking()
                .OrderByDescending(d => d.CreatedAt)
                .Take(8)
                .Select(d => new AdminDocumentRowDto(
                    d.Id,
                    d.Title,
                    d.OriginalFilename,
                    d.User.DisplayName ?? d.User.Username,
                    d.User.Email,
                    d.Status != null ? d.Status.ToString()! : "Unknown",
                    d.PageCount,
                    d.FileSizeBytes,
                    d.TotalVocabularyCount,
                    d.CreatedAt
                ))
                .ToListAsync();

            var recentReports = await ProjectReportRows(_db.MessageReports
                .AsNoTracking()
                .OrderByDescending(r => r.CreatedAt)
                .Take(6))
                .ToListAsync();

            var trendStartDateOnly = DateOnly.FromDateTime(trendStart);

            // Group distinct active users per day from LearningProgress
            var activeProgressDays = await _db.LearningProgresses
                .AsNoTracking()
                .Where(p => p.ActivityDate >= trendStartDateOnly)
                .GroupBy(p => p.ActivityDate)
                .Select(g => new { Date = g.Key, Count = g.Select(p => p.UserId).Distinct().Count() })
                .ToListAsync();

            var activeDateMap = activeProgressDays.ToDictionary(x => x.Date, x => x.Count);

            var activeUserTrend = Enumerable.Range(0, 30)
                .Select(offset =>
                {
                    var date = trendStart.Date.AddDays(offset);
                    var dateOnly = DateOnly.FromDateTime(date);
                    var count = activeDateMap.TryGetValue(dateOnly, out var c) ? c : 0;
                    return new AdminChartPointDto(date.ToString("dd/MM"), date, count, count);
                })
                .ToList();

            var newUserDates = await _db.Users
                .AsNoTracking()
                .Where(u => u.CreatedAt >= trendStart)
                .Select(u => u.CreatedAt!.Value)
                .ToListAsync();

            var newUserTrend = BuildDailySeries(trendStart, newUserDates);

            return Ok(new AdminOverviewDto(stats, topUsers, recentDocuments, recentReports, activeUserTrend, newUserTrend));
        }

        [HttpGet("revenue")]
        public async Task<ActionResult<AdminRevenueDto>> GetRevenue()
        {
            var today = DateTime.UtcNow.Date;
            var dailyStart = today.AddDays(-13);
            var yearStart = DateTime.SpecifyKind(new DateTime(today.Year, 1, 1), DateTimeKind.Utc);

            var dailyRevenue = Enumerable.Range(0, 14)
                .Select(offset =>
                {
                    var date = dailyStart.AddDays(offset);
                    return new AdminChartPointDto(date.ToString("dd/MM"), date, 0m, 0);
                })
                .ToList();

            var monthlyRevenue = Enumerable.Range(0, 12)
                .Select(offset =>
                {
                    var month = yearStart.AddMonths(offset);
                    return new AdminChartPointDto(month.ToString("MMM"), month, 0m, 0);
                })
                .ToList();

            var activeUsers = await _db.Users.CountAsync(u => u.IsActive != false);
            var admins = await _db.Users.CountAsync(u => u.Role == "Admin");
            var planSegments = new List<AdminSegmentDto>
            {
                new("Gói Miễn phí (Free)", Math.Max(activeUsers - admins, 0), "#005cb9"),
                new("Tài khoản Quản trị", admins, "#2d3038")
            };

            var recentTransactions = new List<AdminRevenueTransactionDto>();

            return Ok(new AdminRevenueDto(
                new AdminRevenueSummaryDto(0m, 0m, 0m, 0, 0m),
                dailyRevenue,
                monthlyRevenue,
                planSegments,
                recentTransactions));
        }

        [HttpGet("search-stats")]
        public async Task<ActionResult<AdminSearchStatsDto>> GetSearchStats()
        {
            var today = DateTime.UtcNow.Date;
            var start = today.AddDays(-6);

            var savedWords = await _db.UserVocabularies
                .AsNoTracking()
                .Where(uv => uv.SavedAt >= start)
                .Select(uv => new { uv.SavedAt, uv.UserId, uv.Vocabulary.Word, uv.User.Email, uv.User.DisplayName, uv.User.Username })
                .ToListAsync();

            var dailyLookups = Enumerable.Range(0, 7)
                .Select(offset =>
                {
                    var date = start.AddDays(offset);
                    var count = savedWords.Count(x => x.SavedAt?.Date == date);
                    return new AdminChartPointDto(date.ToString("ddd"), date, count, count);
                })
                .ToList();

            var totalLookups = await _db.UserVocabularies.CountAsync();
            var todayLookups = await _db.UserVocabularies.CountAsync(uv => uv.SavedAt != null && uv.SavedAt.Value.Date == today);
            var activeSearchUsers = savedWords.Where(x => x.SavedAt?.Date == today).Select(x => x.UserId).Distinct().Count();

            var topWords = await _db.UserVocabularies
                .AsNoTracking()
                .GroupBy(uv => new { uv.VocabularyId, uv.Vocabulary.Word, uv.Vocabulary.Pinyin })
                .OrderByDescending(g => g.Count())
                .Take(8)
                .Select(g => new AdminTopWordDto(g.Key.Word, g.Key.Pinyin, g.Count()))
                .ToListAsync();

            var topUsers = await _db.UserVocabularies
                .AsNoTracking()
                .GroupBy(uv => new { uv.UserId, uv.User.Email, uv.User.DisplayName, uv.User.Username })
                .OrderByDescending(g => g.Count())
                .Take(8)
                .Select(g => new AdminSearchUserDto(g.Key.DisplayName ?? g.Key.Username, g.Key.Email, g.Count()))
                .ToListAsync();

            var deviceSegments = new List<AdminSegmentDto>
            {
                new("Desktop", 62, "#005cb9"),
                new("Mobile", 32, "#38bdf8"),
                new("Tablet", 6, "#818cf8")
            };

            return Ok(new AdminSearchStatsDto(
                new AdminSearchSummaryDto(totalLookups, todayLookups, activeSearchUsers),
                dailyLookups,
                deviceSegments,
                topWords,
                topUsers));
        }

        [HttpGet("translation-approvals")]
        public async Task<ActionResult<AdminTranslationApprovalPageDto>> GetTranslationApprovals(
            [FromQuery] string? kind,
            [FromQuery] string? status,
            [FromQuery] string? warningType,
            [FromQuery] string? q,
            [FromQuery] string? dateFrom,
            [FromQuery] string? dateTo,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 8)
        {
            await EnsureTranslationReviewQueueSeeded();

            var normalizedKind = NormalizeFilter(kind, "all");
            var normalizedStatus = NormalizeFilter(status, "Pending");
            var normalizedWarning = NormalizeFilter(warningType, "all");

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 5, 20);

            var query = _db.TranslationReviews.AsNoTracking().AsQueryable();

            if (normalizedKind != "all")
                query = query.Where(r => r.SourceType == normalizedKind);

            if (normalizedStatus != "all")
                query = query.Where(r => r.Status == normalizedStatus);

            if (normalizedWarning != "all")
                query = query.Where(r => r.WarningType == normalizedWarning);

            if (TryParseUtcDate(dateFrom, out var from))
                query = query.Where(r => r.CreatedAt >= from);

            if (TryParseUtcDate(dateTo, out var to))
            {
                var exclusiveTo = to.AddDays(1);
                query = query.Where(r => r.CreatedAt < exclusiveTo);
            }

            if (!string.IsNullOrWhiteSpace(q))
            {
                var pattern = $"%{q.Trim()}%";
                query = query.Where(r =>
                    EF.Functions.ILike(r.SourceText, pattern) ||
                    (r.CurrentTranslation != null && EF.Functions.ILike(r.CurrentTranslation, pattern)) ||
                    (r.ProposedTranslation != null && EF.Functions.ILike(r.ProposedTranslation, pattern)) ||
                    (r.Pinyin != null && EF.Functions.ILike(r.Pinyin, pattern)) ||
                    (r.AdminNote != null && EF.Functions.ILike(r.AdminNote, pattern)));
            }

            var total = await query.CountAsync();
            var vocabularyTotal = await query.CountAsync(r => r.SourceType == "vocabulary");
            var sentenceTotal = await query.CountAsync(r => r.SourceType == "sentence");
            var pendingTotal = await query.CountAsync(r => r.Status == "Pending");
            var approvedTotal = await query.CountAsync(r => r.Status == "Approved");
            var rejectedTotal = await query.CountAsync(r => r.Status == "Rejected");
            var correctedTotal = await query.CountAsync(r => r.Status == "Corrected");

            var items = await query
                .OrderByDescending(r => r.Priority)
                .ThenByDescending(r => r.ReportCount)
                .ThenBy(r => r.ConfidenceScore ?? 1m)
                .ThenByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new AdminTranslationApprovalDto(
                    r.Id,
                    r.SourceType,
                    r.SourceLanguage,
                    r.TargetLanguage,
                    r.SourceText,
                    r.CurrentTranslation ?? "",
                    r.ProposedTranslation ?? r.CurrentTranslation ?? "",
                    r.AdminNote ?? r.AiExplanation ?? "Cần admin xác minh bản dịch trước khi đưa vào kho học liệu.",
                    r.User != null ? r.User.DisplayName ?? r.User.Username : "system",
                    r.CreatedAt,
                    r.Status,
                    r.WarningType,
                    r.ConfidenceScore,
                    r.ReportCount,
                    r.Priority,
                    r.ReviewedAt,
                    r.Pinyin,
                    r.WordType,
                    r.AiExplanation,
                    r.ExampleText))
                .ToListAsync();

            var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
            return Ok(new AdminTranslationApprovalPageDto(
                items,
                total,
                page,
                pageSize,
                totalPages,
                vocabularyTotal,
                sentenceTotal,
                pendingTotal,
                approvedTotal,
                rejectedTotal,
                correctedTotal));
        }

        [HttpPatch("translation-approvals/{id:long}")]
        public async Task<IActionResult> UpdateTranslationApproval(long id, [FromBody] AdminUpdateTranslationApprovalRequest request)
        {
            var review = await _db.TranslationReviews.FindAsync(id);
            if (review == null)
                return NotFound(new { error = "Translation review not found." });

            var nextStatus = NormalizeReviewStatus(request.Status);
            if (nextStatus == null)
                return BadRequest(new { error = "Review status không hợp lệ." });

            var previousStatus = review.Status;
            var proposed = string.IsNullOrWhiteSpace(request.Translation)
                ? review.ProposedTranslation ?? review.CurrentTranslation
                : request.Translation.Trim();

            review.ProposedTranslation = proposed;
            review.AdminNote = request.AdminNote?.Trim();
            review.Status = nextStatus;
            review.ReviewedBy = GetCurrentUserId();
            review.ReviewedAt = DateTime.UtcNow;
            review.UpdatedAt = DateTime.UtcNow;

            if (nextStatus is "Approved" or "Corrected")
                await SyncApprovedTranslation(review, proposed);

            _db.TranslationReviewHistories.Add(new TranslationReviewHistory
            {
                ReviewId = review.Id,
                AdminId = review.ReviewedBy,
                Action = nextStatus,
                PreviousStatus = previousStatus,
                NewStatus = nextStatus,
                Note = review.AdminNote,
                SnapshotJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    review.SourceType,
                    review.SourceEntityId,
                    review.SourceText,
                    review.CurrentTranslation,
                    review.ProposedTranslation,
                    review.WarningType,
                    review.ConfidenceScore,
                    review.ReportCount,
                    review.Priority
                }),
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpPost("translation-approvals/batch-approve")]
        public async Task<IActionResult> BatchApproveTranslations([FromBody] AdminBatchApproveRequest request)
        {
            var ids = request.Ids ?? new List<long>();
            var reviews = await _db.TranslationReviews
                .Where(r => ids.Contains(r.Id) && r.Status == "Pending")
                .ToListAsync();

            var currentUserId = GetCurrentUserId();
            var now = DateTime.UtcNow;

            foreach (var review in reviews)
            {
                review.Status = "Approved";
                review.ReviewedBy = currentUserId;
                review.ReviewedAt = now;
                review.UpdatedAt = now;

                var proposed = review.ProposedTranslation ?? review.CurrentTranslation;
                await SyncApprovedTranslation(review, proposed);
            }

            await _db.SaveChangesAsync();
            return Ok(new { success = true, approvedCount = reviews.Count });
        }

        [HttpGet("users")]
        public async Task<ActionResult<AdminUserPageDto>> GetUsers(
            [FromQuery] string? q,
            [FromQuery] string? role,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 5, 100);

            var query = _db.Users.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var pattern = $"%{q.Trim()}%";
                query = query.Where(u =>
                    EF.Functions.ILike(u.Username, pattern) ||
                    EF.Functions.ILike(u.Email, pattern) ||
                    (u.DisplayName != null && EF.Functions.ILike(u.DisplayName, pattern)));
            }

            if (!string.IsNullOrWhiteSpace(role) && role != "All")
                query = query.Where(u => u.Role == role);

            if (status == "Active")
                query = query.Where(u => u.IsActive != false);
            else if (status == "Locked")
                query = query.Where(u => u.IsActive == false);

            var total = await query.CountAsync();
            var activeTotal = await _db.Users.CountAsync(u => u.IsActive != false);
            var lockedTotal = await _db.Users.CountAsync(u => u.IsActive == false);
            var adminTotal = await _db.Users.CountAsync(u => u.Role == "Admin");

            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new AdminUserRowDto(
                    u.Id,
                    u.Username,
                    u.Email,
                    u.DisplayName,
                    u.Role,
                    u.IsActive ?? true,
                    u.CreatedAt,
                    u.UserStat != null ? u.UserStat.TotalXp ?? 0 : 0,
                    u.UserStat != null ? u.UserStat.CurrentStreakDays ?? 0 : 0,
                    u.UserStat != null ? u.UserStat.TotalStudyMinutes ?? 0 : 0,
                    u.Documents.Count,
                    u.UserVocabularies.Count
                ))
                .ToListAsync();

            var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));

            return Ok(new AdminUserPageDto(users, total, page, pageSize, totalPages, activeTotal, lockedTotal, adminTotal));
        }

        [HttpPatch("users/{id:long}")]
        public async Task<IActionResult> UpdateUser(long id, [FromBody] AdminUpdateUserRequest request)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { error = "User not found." });

            var currentAdminId = GetCurrentUserId();
            if (currentAdminId == id && request.IsActive == false)
                return BadRequest(new { error = "Admin không thể tự khóa tài khoản đang đăng nhập." });

            if (!string.IsNullOrWhiteSpace(request.Role))
            {
                var role = request.Role.Trim();
                if (role is not ("Admin" or "User"))
                    return BadRequest(new { error = "Role chỉ có thể là Admin hoặc User." });
                user.Role = role;
            }

            if (request.IsActive.HasValue)
                user.IsActive = request.IsActive.Value;

            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpGet("documents")]
        public async Task<ActionResult<List<AdminDocumentRowDto>>> GetDocuments([FromQuery] string? q, [FromQuery] string? status)
        {
            var query = _db.Documents.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var pattern = $"%{q.Trim()}%";
                query = query.Where(d =>
                    EF.Functions.ILike(d.Title, pattern) ||
                    EF.Functions.ILike(d.OriginalFilename, pattern) ||
                    EF.Functions.ILike(d.User.Email, pattern));
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "All" && Enum.TryParse<DocumentStatus>(status, true, out var parsedStatus))
                query = query.Where(d => d.Status == parsedStatus);

            var documents = await query
                .OrderByDescending(d => d.CreatedAt)
                .Take(100)
                .Select(d => new AdminDocumentRowDto(
                    d.Id,
                    d.Title,
                    d.OriginalFilename,
                    d.User.DisplayName ?? d.User.Username,
                    d.User.Email,
                    d.Status != null ? d.Status.ToString()! : "Unknown",
                    d.PageCount,
                    d.FileSizeBytes,
                    d.TotalVocabularyCount,
                    d.CreatedAt
                ))
                .ToListAsync();

            return Ok(documents);
        }

        [HttpDelete("documents/{id:long}")]
        public async Task<IActionResult> DeleteDocument(long id)
        {
            var document = await _db.Documents.FindAsync(id);
            if (document == null)
                return NotFound(new { error = "Document not found." });

            _db.Documents.Remove(document);
            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpGet("vocabulary")]
        public async Task<ActionResult<List<AdminVocabularyRowDto>>> GetVocabulary([FromQuery] string? q)
        {
            var query = _db.Vocabularies.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(q))
            {
                var pattern = $"%{q.Trim()}%";
                query = query.Where(v =>
                    EF.Functions.ILike(v.Word, pattern) ||
                    EF.Functions.ILike(v.Pinyin, pattern) ||
                    (v.HanViet != null && EF.Functions.ILike(v.HanViet, pattern)));
            }

            var vocabulary = await query
                .OrderByDescending(v => v.UpdatedAt ?? v.CreatedAt)
                .Take(100)
                .Select(v => new AdminVocabularyRowDto(
                    v.Id,
                    v.Word,
                    v.Pinyin,
                    v.HanViet,
                    v.WordType != null ? v.WordType.ToString()! : null,
                    v.ViTranslated ?? false,
                    v.UserVocabularies.Count,
                    v.UpdatedAt ?? v.CreatedAt
                ))
                .ToListAsync();

            return Ok(vocabulary);
        }

        [HttpPost("vocabulary")]
        public async Task<ActionResult<AdminVocabularyRowDto>> CreateVocabulary([FromBody] AdminVocabularyRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Word) || string.IsNullOrWhiteSpace(request.Pinyin) || string.IsNullOrWhiteSpace(request.Definitions))
                return BadRequest(new { error = "Word, pinyin và definitions là bắt buộc." });

            if (await _db.Vocabularies.AnyAsync(v => v.Word == request.Word.Trim()))
                return Conflict(new { error = "Từ vựng đã tồn tại." });

            var vocab = new Vocabulary
            {
                Word = request.Word.Trim(),
                Pinyin = request.Pinyin.Trim(),
                Definitions = request.Definitions.Trim(),
                HanViet = request.HanViet?.Trim(),
                UsageNotes = request.UsageNotes?.Trim(),
                WordType = ParseWordType(request.WordType),
                ViTranslated = request.ViTranslated,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _db.Vocabularies.Add(vocab);
            await _db.SaveChangesAsync();

            return Ok(new AdminVocabularyRowDto(vocab.Id, vocab.Word, vocab.Pinyin, vocab.HanViet, vocab.WordType?.ToString(), vocab.ViTranslated ?? false, 0, vocab.UpdatedAt));
        }

        [HttpPatch("vocabulary/{id:long}")]
        public async Task<IActionResult> UpdateVocabulary(long id, [FromBody] AdminVocabularyRequest request)
        {
            var vocab = await _db.Vocabularies.FindAsync(id);
            if (vocab == null)
                return NotFound(new { error = "Vocabulary not found." });

            if (!string.IsNullOrWhiteSpace(request.Word))
                vocab.Word = request.Word.Trim();
            if (!string.IsNullOrWhiteSpace(request.Pinyin))
                vocab.Pinyin = request.Pinyin.Trim();
            if (!string.IsNullOrWhiteSpace(request.Definitions))
                vocab.Definitions = request.Definitions.Trim();

            vocab.HanViet = request.HanViet?.Trim();
            vocab.UsageNotes = request.UsageNotes?.Trim();
            vocab.WordType = ParseWordType(request.WordType);
            vocab.ViTranslated = request.ViTranslated;
            vocab.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpDelete("vocabulary/{id:long}")]
        public async Task<IActionResult> DeleteVocabulary(long id)
        {
            var vocab = await _db.Vocabularies.FindAsync(id);
            if (vocab == null)
                return NotFound(new { error = "Vocabulary not found." });

            _db.Vocabularies.Remove(vocab);
            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpGet("reports")]
        public async Task<ActionResult<List<AdminReportRowDto>>> GetReports([FromQuery] string? status)
        {
            var query = _db.MessageReports.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(status) && status != "All" && Enum.TryParse<ReportStatus>(status, true, out var parsedStatus))
                query = query.Where(r => r.Status == parsedStatus);

            var reports = await ProjectReportRows(query
                .OrderByDescending(r => r.CreatedAt)
                .Take(100))
                .ToListAsync();

            return Ok(reports);
        }

        [HttpPatch("reports/{id:long}")]
        public async Task<IActionResult> UpdateReport(long id, [FromBody] AdminUpdateReportRequest request)
        {
            var report = await _db.MessageReports.FindAsync(id);
            if (report == null)
                return NotFound(new { error = "Report not found." });

            if (!Enum.TryParse<ReportStatus>(request.Status, true, out var status))
                return BadRequest(new { error = "Report status không hợp lệ." });

            report.Status = status;
            report.ReviewedBy = GetCurrentUserId();
            report.ReviewedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { success = true });
        }

        private static IQueryable<AdminReportRowDto> ProjectReportRows(IQueryable<MessageReport> query)
        {
            return query.Select(r => new AdminReportRowDto(
                    r.Id,
                    r.Reason,
                    r.Status != null ? r.Status.ToString()! : "Pending",
                    r.Reporter.DisplayName ?? r.Reporter.Username,
                    r.Reporter.Email,
                    r.Message.Sender.DisplayName ?? r.Message.Sender.Username,
                    r.Message.Content,
                    r.CreatedAt,
                    r.ReviewedAt
                ));
        }

        private static List<AdminChartPointDto> BuildDailySeries(DateTime start, IEnumerable<DateTime> dates)
        {
            var dateList = dates.ToList();
            return Enumerable.Range(0, 30)
                .Select(offset =>
                {
                    var date = start.Date.AddDays(offset);
                    var count = dateList.Count(d => d.Date == date);
                    return new AdminChartPointDto(date.ToString("dd/MM"), date, count, count);
                })
                .ToList();
        }

        private async Task EnsureTranslationReviewQueueSeeded()
        {
            // Remove synthetic mock reviews that were automatically generated without real user feedback
            var mockReviews = await _db.TranslationReviews
                .Where(r => r.UserId == null && (r.WarningType == "missing_vi_translation" || r.WarningType == "new_word"))
                .ToListAsync();

            if (mockReviews.Any())
            {
                _db.TranslationReviews.RemoveRange(mockReviews);
                await _db.SaveChangesAsync();
            }
        }

        private async Task SyncApprovedTranslation(TranslationReview review, string? translation)
        {
            if (string.IsNullOrWhiteSpace(translation) || review.SourceEntityId == null)
                return;

            if (review.SourceType == "sentence")
            {
                var sentence = await _db.ExampleSentences.FindAsync(review.SourceEntityId.Value);
                if (sentence != null)
                    sentence.ViText = translation.Trim();
                return;
            }

            if (review.SourceType == "vocabulary")
            {
                var vocab = await _db.Vocabularies.FindAsync(review.SourceEntityId.Value);
                if (vocab == null)
                    return;

                vocab.Definitions = BuildVietnameseDefinitionJson(translation.Trim());
                if (!string.IsNullOrWhiteSpace(review.Pinyin))
                    vocab.Pinyin = review.Pinyin.Trim();
                if (!string.IsNullOrWhiteSpace(review.AiExplanation))
                    vocab.UsageNotes = review.AiExplanation.Trim();
                vocab.ViTranslated = true;
                vocab.UpdatedAt = DateTime.UtcNow;
            }
        }

        private static string BuildVietnameseDefinitionJson(string meaning)
        {
            return System.Text.Json.JsonSerializer.Serialize(new[] { new { lang = "vi", meaning } });
        }

        private static string NormalizeFilter(string? value, string fallback)
        {
            return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
        }

        private static string? NormalizeReviewStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
                return null;

            var normalized = status.Trim();
            return normalized is "Pending" or "Approved" or "Rejected" or "Corrected" ? normalized : null;
        }

        private static bool TryParseUtcDate(string? value, out DateTime date)
        {
            date = default;
            if (string.IsNullOrWhiteSpace(value) || !DateTime.TryParse(value, out var parsed))
                return false;

            date = DateTime.SpecifyKind(parsed.Date, DateTimeKind.Utc);
            return true;
        }

        private long? GetCurrentUserId()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? User.FindFirstValue("sub");
            return long.TryParse(raw, out var id) ? id : null;
        }

        private static WordType? ParseWordType(string? value)
        {
            return Enum.TryParse<WordType>(value, true, out var wordType) ? wordType : null;
        }
    }

    public record AdminOverviewDto(
        AdminOverviewStatsDto Stats,
        List<AdminUserRowDto> TopUsers,
        List<AdminDocumentRowDto> RecentDocuments,
        List<AdminReportRowDto> RecentReports,
        List<AdminChartPointDto> ActiveUserTrend,
        List<AdminChartPointDto> NewUserTrend
    );

    public record AdminChartPointDto(string Label, DateTime Date, decimal Value, int Count);

    public record AdminSegmentDto(string Label, decimal Value, string Color);

    public record AdminRevenueDto(
        AdminRevenueSummaryDto Summary,
        List<AdminChartPointDto> DailyRevenue,
        List<AdminChartPointDto> MonthlyRevenue,
        List<AdminSegmentDto> PlanSegments,
        List<AdminRevenueTransactionDto> RecentTransactions
    );

    public record AdminRevenueSummaryDto(decimal Today, decimal ThisWeek, decimal ThisMonth, int TotalOrders, decimal AverageOrderValue);

    public record AdminRevenueTransactionDto(string Id, string Customer, string Description, decimal Amount, string Status, DateTime? CreatedAt);

    public record AdminSearchStatsDto(
        AdminSearchSummaryDto Summary,
        List<AdminChartPointDto> DailyLookups,
        List<AdminSegmentDto> DeviceSegments,
        List<AdminTopWordDto> TopWords,
        List<AdminSearchUserDto> TopUsers
    );

    public record AdminSearchSummaryDto(int TotalLookups, int TodayLookups, int ActiveUsers);

    public record AdminTopWordDto(string Word, string? Pinyin, int LookupCount);

    public record AdminSearchUserDto(string Name, string Email, int LookupCount);

    public record AdminTranslationApprovalPageDto(
        List<AdminTranslationApprovalDto> Items,
        int Total,
        int Page,
        int PageSize,
        int TotalPages,
        int VocabularyTotal,
        int SentenceTotal,
        int PendingTotal,
        int ApprovedTotal,
        int RejectedTotal,
        int CorrectedTotal
    );

    public record AdminTranslationApprovalDto(
        long Id,
        string Kind,
        string SourceLanguage,
        string TargetLanguage,
        string SourceText,
        string AiTranslation,
        string UserSuggestion,
        string Note,
        string RequestedBy,
        DateTime? CreatedAt,
        string Status,
        string WarningType,
        decimal? ConfidenceScore,
        int ReportCount,
        int Priority,
        DateTime? ReviewedAt,
        string? Pinyin,
        string? WordType,
        string? AiExplanation,
        string? ExampleText
    );

    public record AdminOverviewStatsDto(
        int TotalUsers,
        int ActiveUsers,
        int AdminUsers,
        int NewUsers7d,
        int TotalDocuments,
        int Documents7d,
        int ProcessingDocuments,
        int FailedDocuments,
        int TotalVocabulary,
        int VietnameseReadyVocabulary,
        int CommunityMessages,
        int PendingReports,
        int TotalStudyMinutes,
        int TotalXp
    );

    public record AdminUserRowDto(
        long Id,
        string Username,
        string Email,
        string? DisplayName,
        string Role,
        bool IsActive,
        DateTime? CreatedAt,
        int TotalXp,
        int CurrentStreakDays,
        int TotalStudyMinutes,
        int DocumentCount,
        int VocabularyCount
    );

    public record AdminUserPageDto(
        List<AdminUserRowDto> Items,
        int Total,
        int Page,
        int PageSize,
        int TotalPages,
        int ActiveTotal,
        int LockedTotal,
        int AdminTotal
    );

    public record AdminDocumentRowDto(
        long Id,
        string Title,
        string OriginalFilename,
        string OwnerName,
        string OwnerEmail,
        string Status,
        int? PageCount,
        long? FileSizeBytes,
        int? TotalVocabularyCount,
        DateTime? CreatedAt
    );

    public record AdminVocabularyRowDto(
        long Id,
        string Word,
        string Pinyin,
        string? HanViet,
        string? WordType,
        bool ViTranslated,
        int SavedByUsers,
        DateTime? UpdatedAt
    );

    public record AdminReportRowDto(
        long Id,
        string Reason,
        string Status,
        string ReporterName,
        string ReporterEmail,
        string MessageAuthor,
        string MessageContent,
        DateTime? CreatedAt,
        DateTime? ReviewedAt
    );

    public record AdminUpdateUserRequest(string? Role, bool? IsActive);

    public record AdminVocabularyRequest(
        string? Word,
        string? Pinyin,
        string? Definitions,
        string? HanViet,
        string? UsageNotes,
        string? WordType,
        bool ViTranslated
    );

    public record AdminUpdateReportRequest(string Status);

    public record AdminBatchApproveRequest(List<long>? Ids);

    public record AdminUpdateTranslationApprovalRequest(string? Kind, string Status, string? Translation, string? AdminNote);
}
