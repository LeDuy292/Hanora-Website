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

            var activeDates = await _db.UserStats
                .AsNoTracking()
                .Where(s => s.LastActiveDate != null)
                .Select(s => s.LastActiveDate!.Value)
                .ToListAsync();

            var newUserDates = await _db.Users
                .AsNoTracking()
                .Where(u => u.CreatedAt >= trendStart)
                .Select(u => u.CreatedAt!.Value)
                .ToListAsync();

            var activeUserTrend = BuildDailySeries(
                trendStart,
                activeDates.Select(d => d.ToDateTime(TimeOnly.MinValue)));

            var newUserTrend = BuildDailySeries(trendStart, newUserDates);

            return Ok(new AdminOverviewDto(stats, topUsers, recentDocuments, recentReports, activeUserTrend, newUserTrend));
        }

        [HttpGet("revenue")]
        public async Task<ActionResult<AdminRevenueDto>> GetRevenue()
        {
            var today = DateTime.UtcNow.Date;
            var weekStart = today.AddDays(-6);
            var dailyStart = today.AddDays(-13);
            var yearStart = DateTime.SpecifyKind(new DateTime(today.Year, 1, 1), DateTimeKind.Utc);
            const decimal learnerActivationValue = 49000m;
            const decimal documentProcessingValue = 12000m;

            var users = await _db.Users
                .AsNoTracking()
                .Where(u => u.CreatedAt >= dailyStart)
                .Select(u => u.CreatedAt!.Value)
                .ToListAsync();

            var documents = await _db.Documents
                .AsNoTracking()
                .Where(d => d.CreatedAt >= dailyStart)
                .Select(d => new { CreatedAt = d.CreatedAt!.Value, d.Title, Owner = d.User.DisplayName ?? d.User.Username })
                .ToListAsync();

            var dailyRevenue = Enumerable.Range(0, 14)
                .Select(offset =>
                {
                    var date = dailyStart.AddDays(offset);
                    var userCount = users.Count(d => d.Date == date);
                    var docCount = documents.Count(d => d.CreatedAt.Date == date);
                    var value = userCount * learnerActivationValue + docCount * documentProcessingValue;
                    return new AdminChartPointDto(date.ToString("dd/MM"), date, value, userCount + docCount);
                })
                .ToList();

            var monthlyRevenue = Enumerable.Range(0, 12)
                .Select(offset =>
                {
                    var month = yearStart.AddMonths(offset);
                    var next = month.AddMonths(1);
                    var userCount = _db.Users.Count(u => u.CreatedAt >= month && u.CreatedAt < next);
                    var docCount = _db.Documents.Count(d => d.CreatedAt >= month && d.CreatedAt < next);
                    var value = userCount * learnerActivationValue + docCount * documentProcessingValue;
                    return new AdminChartPointDto(month.ToString("MMM"), month, value, userCount + docCount);
                })
                .ToList();

            var todayRevenue = dailyRevenue.Where(p => p.Date.Date == today).Sum(p => p.Value);
            var weekRevenue = dailyRevenue.Where(p => p.Date >= weekStart).Sum(p => p.Value);
            var monthRevenue = monthlyRevenue.FirstOrDefault(p => p.Date.Month == today.Month)?.Value ?? 0;
            var totalOrders = await _db.Users.CountAsync() + await _db.Documents.CountAsync();
            var averageOrderValue = totalOrders > 0 ? monthRevenue / Math.Max(1, monthlyRevenue.FirstOrDefault(p => p.Date.Month == today.Month)?.Count ?? 1) : 0;

            var activeUsers = await _db.Users.CountAsync(u => u.IsActive != false);
            var admins = await _db.Users.CountAsync(u => u.Role == "Admin");
            var documentOwners = await _db.Documents.Select(d => d.UserId).Distinct().CountAsync();
            var planSegments = new List<AdminSegmentDto>
            {
                new("Basic", Math.Max(activeUsers - documentOwners, 0), "#abc7ff"),
                new("Pro", documentOwners, "#005cb9"),
                new("Admin", admins, "#2d3038")
            };

            var recentTransactions = documents
                .OrderByDescending(d => d.CreatedAt)
                .Take(8)
                .Select((d, index) => new AdminRevenueTransactionDto(
                    $"DOC-{d.CreatedAt:MMdd}-{index + 1}",
                    d.Owner,
                    d.Title,
                    documentProcessingValue,
                    "Completed",
                    d.CreatedAt))
                .ToList();

            return Ok(new AdminRevenueDto(
                new AdminRevenueSummaryDto(todayRevenue, weekRevenue, monthRevenue, totalOrders, averageOrderValue),
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
            [FromQuery] string? q,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 8)
        {
            var normalizedKind = string.IsNullOrWhiteSpace(kind) ? "all" : kind.Trim().ToLowerInvariant();
            if (normalizedKind is not ("all" or "vocabulary" or "sentence"))
                normalizedKind = "all";

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 5, 20);
            var takeForMerge = page * pageSize;

            var vocabularyQuery = _db.Vocabularies
                .AsNoTracking()
                .Where(v => v.ViTranslated != true);

            var sentenceQuery = _db.ExampleSentences
                .AsNoTracking()
                .Where(e => e.ViText == null);

            if (!string.IsNullOrWhiteSpace(q))
            {
                var pattern = $"%{q.Trim()}%";
                vocabularyQuery = vocabularyQuery.Where(v =>
                    EF.Functions.ILike(v.Word, pattern) ||
                    EF.Functions.ILike(v.Pinyin, pattern) ||
                    (v.HanViet != null && EF.Functions.ILike(v.HanViet, pattern)) ||
                    EF.Functions.ILike(v.Definitions, pattern));

                sentenceQuery = sentenceQuery.Where(e =>
                    EF.Functions.ILike(e.ZhText, pattern) ||
                    (e.EnText != null && EF.Functions.ILike(e.EnText, pattern)) ||
                    (e.Source != null && EF.Functions.ILike(e.Source, pattern)));
            }

            var vocabularyTotal = await vocabularyQuery.CountAsync();
            var sentenceTotal = await sentenceQuery.CountAsync();
            var total = normalizedKind switch
            {
                "vocabulary" => vocabularyTotal,
                "sentence" => sentenceTotal,
                _ => vocabularyTotal + sentenceTotal
            };

            var vocabularyTake = normalizedKind == "sentence" ? 0 : takeForMerge;
            var sentenceTake = normalizedKind == "vocabulary" ? 0 : takeForMerge;

            var vocabularyItems = vocabularyTake == 0
                ? new List<AdminTranslationApprovalDto>()
                : await vocabularyQuery
                    .OrderByDescending(v => v.UpdatedAt ?? v.CreatedAt)
                    .Take(vocabularyTake)
                    .Select(v => new AdminTranslationApprovalDto(
                    v.Id,
                    "vocabulary",
                    "ZH",
                    "VI",
                    v.Word,
                    v.Definitions,
                    v.HanViet ?? "",
                    v.UsageNotes ?? "Can duyet nghia tieng Viet cho tu vung.",
                    "Hanora AI",
                    v.CreatedAt,
                    "Pending"))
                    .ToListAsync();

            var sentenceItems = sentenceTake == 0
                ? new List<AdminTranslationApprovalDto>()
                : await sentenceQuery
                    .OrderByDescending(e => e.CreatedAt)
                    .Take(sentenceTake)
                    .Select(e => new AdminTranslationApprovalDto(
                    e.Id,
                    "sentence",
                    "ZH",
                    "VI",
                    e.ZhText,
                    e.EnText ?? "",
                    e.ViText ?? "",
                    "Can bo sung ban dich tieng Viet cho cau vi du.",
                    e.Source ?? "system",
                    e.CreatedAt,
                    "Pending"))
                    .ToListAsync();

            var items = vocabularyItems
                .Concat(sentenceItems)
                .OrderByDescending(i => i.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
            return Ok(new AdminTranslationApprovalPageDto(
                items,
                total,
                page,
                pageSize,
                totalPages,
                vocabularyTotal,
                sentenceTotal));
        }

        [HttpPatch("translation-approvals/{id:long}")]
        public async Task<IActionResult> UpdateTranslationApproval(long id, [FromBody] AdminUpdateTranslationApprovalRequest request)
        {
            if (request.Kind == "sentence")
            {
                var sentence = await _db.ExampleSentences.FindAsync(id);
                if (sentence == null)
                    return NotFound(new { error = "Sentence not found." });

                if (request.Status == "Approved")
                    sentence.ViText = string.IsNullOrWhiteSpace(request.Translation) ? sentence.ViText ?? sentence.EnText : request.Translation.Trim();

                await _db.SaveChangesAsync();
                return Ok(new { success = true });
            }

            var vocab = await _db.Vocabularies.FindAsync(id);
            if (vocab == null)
                return NotFound(new { error = "Vocabulary not found." });

            if (request.Status == "Approved")
            {
                if (!string.IsNullOrWhiteSpace(request.Translation))
                    vocab.Definitions = $"[{{\"lang\":\"vi\",\"meaning\":\"{request.Translation.Trim().Replace("\"", "\\\"")}\"}}]";
                vocab.ViTranslated = true;
                vocab.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpGet("users")]
        public async Task<ActionResult<List<AdminUserRowDto>>> GetUsers([FromQuery] string? q, [FromQuery] string? role, [FromQuery] string? status)
        {
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

            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Take(100)
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

            return Ok(users);
        }

        [HttpPatch("users/{id:long}")]
        public async Task<IActionResult> UpdateUser(long id, [FromBody] AdminUpdateUserRequest request)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { error = "User not found." });

            var currentAdminId = GetCurrentUserId();
            if (currentAdminId == id && request.IsActive == false)
                return BadRequest(new { error = "Admin khong the tu khoa tai khoan dang dang nhap." });

            if (!string.IsNullOrWhiteSpace(request.Role))
            {
                var role = request.Role.Trim();
                if (role is not ("Admin" or "User"))
                    return BadRequest(new { error = "Role chi co the la Admin hoac User." });
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
                return BadRequest(new { error = "Word, pinyin va definitions la bat buoc." });

            if (await _db.Vocabularies.AnyAsync(v => v.Word == request.Word.Trim()))
                return Conflict(new { error = "Tu vung da ton tai." });

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
                return BadRequest(new { error = "Report status khong hop le." });

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
        int SentenceTotal
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
        string Status
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

    public record AdminUpdateTranslationApprovalRequest(string Kind, string Status, string? Translation);
}
