using BusinessObjects.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Repositories;
using Services;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace Hanora.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IDocumentProcessingService _documentProcessingService;
    private readonly IDocumentRepository _documentRepository;
    private readonly IS3StorageService _s3StorageService;

    private readonly DataAccessObjects.AppDbContext _db;
    private readonly IStatsService _statsService;

    public DocumentsController(
        IDocumentProcessingService documentProcessingService,
        IDocumentRepository documentRepository,
        IS3StorageService s3StorageService,
        DataAccessObjects.AppDbContext db,
        IStatsService statsService)
    {
        _documentProcessingService = documentProcessingService;
        _documentRepository = documentRepository;
        _s3StorageService = s3StorageService;
        _db = db;
        _statsService = statsService;
    }

    public class PresignedUrlRequestDto
    {
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
    }

    public class RegisterDocumentDto
    {
        public string FileUrl { get; set; } = string.Empty;
        public string OriginalFilename { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long FileSizeBytes { get; set; }
    }

    [HttpPost("presigned-url")]
    public async Task<IActionResult> GetPresignedUrl([FromBody] PresignedUrlRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.FileName) || string.IsNullOrWhiteSpace(request.ContentType))
        {
            return BadRequest("FileName and ContentType are required.");
        }

        var result = await _s3StorageService.GeneratePreSignedUrlAsync(request.FileName, request.ContentType);

        return Ok(new
        {
            PresignedUrl = result.PresignedUrl,
            FileUrl = result.FileUrl
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> RegisterDocument([FromBody] RegisterDocumentDto request)
    {
        if (string.IsNullOrWhiteSpace(request.FileUrl) || string.IsNullOrWhiteSpace(request.OriginalFilename))
        {
            return BadRequest("FileUrl and OriginalFilename are required.");
        }

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdString, out long userId))
        {
            userId = 1; 
        }

        var document = await _documentProcessingService.RegisterDocumentAsync(
            userId, 
            request.FileUrl, 
            request.OriginalFilename, 
            request.ContentType, 
            request.FileSizeBytes
        );

        return Ok(new
        {
            document.Id,
            document.Title,
            document.Status,
            Message = "Document registered and is being processed in the background."
        });
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadDocument(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("No file uploaded.");
        }

        const long MaxFileSize = 5 * 1024 * 1024; // 5 MB
        if (file.Length > MaxFileSize)
        {
            return BadRequest("File size exceeds the 5MB limit.");
        }

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdString, out long userId))
        {
            userId = 1; 
        }

        var document = await _documentProcessingService.ProcessUploadedFileAsync(userId, file);

        return Ok(new
        {
            document.Id,
            document.Title,
            document.Status,
            Message = "Document is being processed in the background."
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDocument(long id)
    {
        var document = await _documentRepository.GetByIdAsync(id);
        if (document == null)
        {
            return NotFound();
        }

        return Ok(new
        {
            document.Id,
            document.Title,
            document.FileUrl,
            document.Status,
            document.ExtractedText
        });
    }

    [HttpGet("my-documents")]
    public async Task<IActionResult> GetMyDocuments()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdString, out long userId))
        {
            userId = 1; 
        }

        var documents = await _documentRepository.GetByUserIdAsync(userId);
        var result = documents.Select(d => new
        {
            d.Id,
            d.Title,
            d.Status,
            d.CreatedAt
        });

        return Ok(result);
    }

    [HttpGet("{id}/annotations")]
    public async Task<IActionResult> GetAnnotations(long id)
    {
        var document = await _documentRepository.GetByIdAsync(id);
        if (document == null)
        {
            return NotFound();
        }

        return Ok(new { AnnotationsJson = document.AnnotationsJson });
    }

    [HttpPost("{id}/annotations")]
    public async Task<IActionResult> SaveAnnotations(long id, [FromBody] SaveAnnotationsRequest request)
    {
        var document = await _documentRepository.GetByIdAsync(id);
        if (document == null)
        {
            return NotFound();
        }

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdString, out long userId)) userId = 1;

        int length = document.ExtractedText?.Length ?? 0;
        int maxHighlights = Math.Max(5, length / 100);
        int maxNotes = Math.Max(3, length / 200);

        var options = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        
        int oldHighlightsCount = 0;
        int oldNotesCount = 0;
        if (!string.IsNullOrEmpty(document.AnnotationsJson))
        {
            try
            {
                var oldAnnos = System.Text.Json.JsonSerializer.Deserialize<AnnotationsDto>(document.AnnotationsJson, options);
                if (oldAnnos != null)
                {
                    oldHighlightsCount = oldAnnos.Highlights?.Count ?? 0;
                    oldNotesCount = (oldAnnos.TextNotes?.Count ?? 0) + (oldAnnos.StickyNotes?.Count ?? 0);
                }
            }
            catch {}
        }

        int newHighlightsCount = 0;
        int newNotesCount = 0;
        if (!string.IsNullOrEmpty(request.AnnotationsJson))
        {
            try
            {
                var newAnnos = System.Text.Json.JsonSerializer.Deserialize<AnnotationsDto>(request.AnnotationsJson, options);
                if (newAnnos != null)
                {
                    newHighlightsCount = newAnnos.Highlights?.Count ?? 0;
                    newNotesCount = (newAnnos.TextNotes?.Count ?? 0) + (newAnnos.StickyNotes?.Count ?? 0);
                }
            }
            catch {}
        }

        int awardHighlights = Math.Max(0, Math.Min(newHighlightsCount - oldHighlightsCount, maxHighlights - oldHighlightsCount));
        int awardNotes = Math.Max(0, Math.Min(newNotesCount - oldNotesCount, maxNotes - oldNotesCount));

        int totalXpToAward = (awardHighlights * 1) + (awardNotes * 2);

        document.AnnotationsJson = request.AnnotationsJson;
        await _documentRepository.UpdateAsync(document);

        if (totalXpToAward > 0)
        {
            await _statsService.AwardXpAsync(userId, totalXpToAward, $"Tạo highlight/note trên tài liệu: {document.Title}");
        }

        return Ok(new { Message = "Annotations saved successfully." });
    }

    [HttpPost("{id}/progress")]
    public async Task<IActionResult> UpdateProgress(long id, [FromBody] UpdateProgressRequest request)
    {
        var document = await _documentRepository.GetByIdAsync(id);
        if (document == null)
        {
            return NotFound();
        }

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdString, out long userId)) userId = 1;

        var progress = await _db.DocumentReadingProgresses
            .FirstOrDefaultAsync(p => p.UserId == userId && p.DocumentId == id);

        decimal oldPercent = progress?.ProgressPercent ?? 0m;
        int oldMinutes = progress?.ReadingMinutes ?? 0;

        if (progress == null)
        {
            progress = new DocumentReadingProgress
            {
                UserId = userId,
                DocumentId = id,
                LastPage = request.LastPage,
                ProgressPercent = request.ProgressPercent,
                ReadingMinutes = request.ReadingMinutes,
                LastReadAt = DateTime.UtcNow
            };
            _db.DocumentReadingProgresses.Add(progress);
        }
        else
        {
            progress.LastPage = request.LastPage;
            progress.ProgressPercent = request.ProgressPercent;
            progress.ReadingMinutes = request.ReadingMinutes;
            progress.LastReadAt = DateTime.UtcNow;
            _db.DocumentReadingProgresses.Update(progress);
        }
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException pgEx && pgEx.SqlState == "23505")
        {
            // Concurrency: Another request already inserted the record. Detach the failed insert and update instead.
            if (progress != null)
            {
                _db.Entry(progress).State = EntityState.Detached;
            }
            
            progress = await _db.DocumentReadingProgresses
                .FirstOrDefaultAsync(p => p.UserId == userId && p.DocumentId == id);
                
            if (progress != null)
            {
                progress.LastPage = request.LastPage;
                progress.ProgressPercent = request.ProgressPercent;
                progress.ReadingMinutes = request.ReadingMinutes;
                progress.LastReadAt = DateTime.UtcNow;
                _db.DocumentReadingProgresses.Update(progress);
                await _db.SaveChangesAsync();
            }
        }

        int deltaMinutes = request.ReadingMinutes - oldMinutes;
        if (deltaMinutes > 0)
        {
            await _statsService.TrackTimeAsync(userId, deltaMinutes);
        }

        if (oldPercent < 100m && request.ProgressPercent >= 100m)
        {
            var stats = await _db.UserStats.FirstOrDefaultAsync(s => s.UserId == userId);
            if (stats != null)
            {
                stats.TotalDocumentsRead = (stats.TotalDocumentsRead ?? 0) + 1;
                stats.UpdatedAt = DateTime.UtcNow;
                _db.UserStats.Update(stats);
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow + TimeSpan.FromHours(7));
            var dailyProgress = await _db.LearningProgresses
                .FirstOrDefaultAsync(p => p.UserId == userId && p.ActivityDate == today);
            if (dailyProgress != null)
            {
                dailyProgress.DocumentsRead = (dailyProgress.DocumentsRead ?? 0) + 1;
                _db.LearningProgresses.Update(dailyProgress);
            }
            await _db.SaveChangesAsync();

            await _statsService.AwardXpAsync(userId, 40, $"Đọc hoàn thành tài liệu: {document.Title}");
        }

        return Ok(new { message = "Progress updated successfully." });
    }

    [HttpGet("all-highlights")]
    public async Task<IActionResult> GetAllHighlights()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdString, out long userId))
        {
            userId = 1; 
        }

        var documents = await _documentRepository.GetByUserIdAsync(userId);
        var resultList = new System.Collections.Generic.List<object>();

        var options = new System.Text.Json.JsonSerializerOptions 
        { 
            PropertyNameCaseInsensitive = true 
        };

        foreach (var doc in documents)
        {
            if (string.IsNullOrEmpty(doc.AnnotationsJson)) continue;

            try
            {
                var annotations = System.Text.Json.JsonSerializer.Deserialize<AnnotationsDto>(doc.AnnotationsJson, options);
                if (annotations == null) continue;

                var segments = new System.Collections.Generic.List<string>();
                if (!string.IsNullOrEmpty(doc.ExtractedText))
                {
                    segments = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.List<string>>(doc.ExtractedText, options) 
                               ?? new System.Collections.Generic.List<string>();
                }

                var allIndices = new System.Collections.Generic.HashSet<string>();
                if (annotations.Highlights != null) 
                    foreach (var k in annotations.Highlights.Keys) allIndices.Add(k);
                if (annotations.TextNotes != null) 
                    foreach (var k in annotations.TextNotes.Keys) allIndices.Add(k);
                if (annotations.StickyNotes != null) 
                    foreach (var k in annotations.StickyNotes.Keys) allIndices.Add(k);

                foreach (var key in allIndices)
                {
                    if (int.TryParse(key, out int index) && index >= 0 && index < segments.Count)
                    {
                        var word = segments[index];
                        
                        string? color = null;
                        if (annotations.Highlights != null)
                            annotations.Highlights.TryGetValue(key, out color);

                        string? textNote = null;
                        if (annotations.TextNotes != null)
                            annotations.TextNotes.TryGetValue(key, out textNote);

                        string? stickyNote = null;
                        if (annotations.StickyNotes != null)
                            annotations.StickyNotes.TryGetValue(key, out stickyNote);

                        resultList.Add(new
                        {
                            DocumentId = doc.Id,
                            DocumentTitle = doc.Title,
                            Index = index,
                            Word = word,
                            Color = color,
                            TextNote = textNote,
                            StickyNote = stickyNote,
                            CreatedAt = doc.CreatedAt
                        });
                    }
                }
            }
            catch
            {
                // Skip parse errors
            }
        }

        return Ok(resultList);
    }

    [HttpGet("{id}/export-docx")]
    public async Task<IActionResult> ExportDocx(long id)
    {
        var documentEntity = await _documentRepository.GetByIdAsync(id);
        if (documentEntity == null)
        {
            return NotFound();
        }

        var docTitle = documentEntity.Title ?? "Hanora_Document";
        
        using (var memoryStream = new System.IO.MemoryStream())
        {
            using (var doc = Xceed.Words.NET.DocX.Create(memoryStream))
            {
                // Title
                var titleParagraph = doc.InsertParagraph();
                titleParagraph.Append(docTitle)
                    .Font(new Xceed.Document.NET.Font("Arial"))
                    .FontSize(20D)
                    .Bold()
                    .Alignment = Xceed.Document.NET.Alignment.center;
                titleParagraph.SpacingAfter(20D);

                // Section 1: Original text
                var textHeading = doc.InsertParagraph();
                textHeading.Append("I. NỘI DUNG TÀI LIỆU GỐC")
                    .Font(new Xceed.Document.NET.Font("Arial"))
                    .FontSize(14D)
                    .Bold()
                    .Color(Xceed.Drawing.Color.Blue);
                textHeading.SpacingAfter(10D);

                var segments = new System.Collections.Generic.List<string>();
                if (!string.IsNullOrEmpty(documentEntity.ExtractedText))
                {
                    try { segments = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.List<string>>(documentEntity.ExtractedText) ?? new System.Collections.Generic.List<string>(); } catch { }
                }

                AnnotationsDto docAnnotations = null;
                if (!string.IsNullOrEmpty(documentEntity.AnnotationsJson))
                {
                    try {
                        var options = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                        docAnnotations = System.Text.Json.JsonSerializer.Deserialize<AnnotationsDto>(documentEntity.AnnotationsJson, options);
                    } catch { }
                }

                if (segments.Count > 0)
                {
                    var p = doc.InsertParagraph();
                    p.SpacingAfter(10D);
                    
                    bool nextIsHeading = false;
                    bool nextIsCenter = false;
                    bool nextIsIndent = false;

                    for (int i = 0; i < segments.Count; i++)
                    {
                        string text = segments[i];

                        if (text.Contains("#CENTER#")) { nextIsCenter = true; text = text.Replace("#CENTER#", ""); segments[i] = text; }
                        if (text.Contains("#INDENT#")) { nextIsIndent = true; text = text.Replace("#INDENT#", ""); segments[i] = text; }
                        if (text.Contains("#HEADING#")) { nextIsHeading = true; text = text.Replace("#HEADING#", ""); segments[i] = text; }
                        if (text.StartsWith("#IMAGE:")) { text = System.Text.RegularExpressions.Regex.Replace(text, @"#IMAGE:.*?#", ""); segments[i] = text; }
                        
                        if (text == "#")
                        {
                            string peek = "";
                            int endIdx = -1;
                            for (int k = i + 1; k < segments.Count && k < i + 15; k++)
                            {
                                peek += segments[k];
                                if (segments[k].Contains("#")) { endIdx = k; break; }
                            }
                            
                            string fullMarker = "#" + peek;
                            if (fullMarker == "#CENTER#" || fullMarker == "#INDENT#" || fullMarker == "#HEADING#" || fullMarker.StartsWith("#IMAGE:"))
                            {
                                if (fullMarker == "#CENTER#") nextIsCenter = true;
                                else if (fullMarker == "#INDENT#") nextIsIndent = true;
                                else if (fullMarker == "#HEADING#") nextIsHeading = true;

                                for (int k = i; k <= endIdx; k++) segments[k] = "";
                                text = "";
                            }
                        }

                        if (string.IsNullOrEmpty(text) && !text.Contains("\n")) continue;

                        Xceed.Document.NET.Highlight highlightColor = Xceed.Document.NET.Highlight.none;
                        string textNote = null;
                        string stickyNote = null;

                        if (docAnnotations != null)
                        {
                            string key = i.ToString();
                            if (docAnnotations.Highlights != null && docAnnotations.Highlights.TryGetValue(key, out var colorHex))
                            {
                                if (colorHex == "#fef08a") highlightColor = Xceed.Document.NET.Highlight.yellow;
                                else if (colorHex == "#bbf7d0") highlightColor = Xceed.Document.NET.Highlight.green;
                                else if (colorHex == "#bfdbfe") highlightColor = Xceed.Document.NET.Highlight.blue;
                                else if (colorHex == "#e9d5ff") highlightColor = Xceed.Document.NET.Highlight.magenta;
                                else if (colorHex == "#fbcfe8") highlightColor = Xceed.Document.NET.Highlight.magenta;
                                else if (colorHex == "#fecaca") highlightColor = Xceed.Document.NET.Highlight.red;
                                else highlightColor = Xceed.Document.NET.Highlight.yellow;
                            }
                            if (docAnnotations.TextNotes != null) docAnnotations.TextNotes.TryGetValue(key, out textNote);
                            if (docAnnotations.StickyNotes != null) docAnnotations.StickyNotes.TryGetValue(key, out stickyNote);
                        }

                        if (!string.IsNullOrEmpty(textNote)) textNote = System.Text.RegularExpressions.Regex.Replace(textNote, @"^\[.*?\]\s*", "");
                        if (!string.IsNullOrEmpty(stickyNote)) stickyNote = System.Text.RegularExpressions.Regex.Replace(stickyNote, @"^\[.*?\]\s*", "");

                        if (text.Contains("\n"))
                        {
                            var parts = text.Split('\n');
                            for (int j = 0; j < parts.Length; j++)
                            {
                                if (j > 0)
                                {
                                    p = doc.InsertParagraph();
                                    p.SpacingAfter(10D);
                                    if (nextIsCenter) { p.Alignment = Xceed.Document.NET.Alignment.center; nextIsCenter = false; }
                                    if (nextIsIndent) { p.IndentationFirstLine = 36.0f; nextIsIndent = false; }
                                    if (parts.Length > 1 && j == parts.Length - 1) { nextIsHeading = false; } // Reset heading on new paragraph
                                }
                                if (!string.IsNullOrEmpty(parts[j]))
                                {
                                    if (string.IsNullOrWhiteSpace(p.Text) && nextIsCenter) { p.Alignment = Xceed.Document.NET.Alignment.center; nextIsCenter = false; }
                                    if (string.IsNullOrWhiteSpace(p.Text) && nextIsIndent) { p.IndentationFirstLine = 36.0f; nextIsIndent = false; }

                                    var app = p.Append(parts[j]).Font(new Xceed.Document.NET.Font("Arial")).FontSize(nextIsHeading ? 14D : 12D);
                                    if (nextIsHeading) app.Bold();
                                    if (highlightColor != Xceed.Document.NET.Highlight.none) app.Highlight(highlightColor);
                                }

                                if (j == parts.Length - 1)
                                {
                                    if (!string.IsNullOrEmpty(textNote))
                                    {
                                        p.Append($" [Ghi chú: {textNote}] ")
                                         .Font(new Xceed.Document.NET.Font("Arial"))
                                         .FontSize(11D)
                                         .Italic()
                                         .Color(Xceed.Drawing.Color.DarkRed);
                                    }
                                    if (!string.IsNullOrEmpty(stickyNote))
                                    {
                                        p.Append($" [Ghi chú nổi: {stickyNote}] ")
                                         .Font(new Xceed.Document.NET.Font("Arial"))
                                         .FontSize(11D)
                                         .Italic()
                                         .Color(Xceed.Drawing.Color.DarkMagenta);
                                    }
                                }
                            }
                        }
                        else
                        {
                            if (!string.IsNullOrEmpty(text))
                            {
                                if (string.IsNullOrWhiteSpace(p.Text) && nextIsCenter) { p.Alignment = Xceed.Document.NET.Alignment.center; nextIsCenter = false; }
                                if (string.IsNullOrWhiteSpace(p.Text) && nextIsIndent) { p.IndentationFirstLine = 36.0f; nextIsIndent = false; }

                                var app = p.Append(text).Font(new Xceed.Document.NET.Font("Arial")).FontSize(nextIsHeading ? 14D : 12D);
                                if (nextIsHeading) app.Bold();
                                if (highlightColor != Xceed.Document.NET.Highlight.none) app.Highlight(highlightColor);
                                
                                if (!string.IsNullOrEmpty(textNote))
                                {
                                    p.Append($" [Ghi chú: {textNote}] ")
                                     .Font(new Xceed.Document.NET.Font("Arial"))
                                     .FontSize(11D)
                                     .Italic()
                                     .Color(Xceed.Drawing.Color.DarkRed);
                                }
                                if (!string.IsNullOrEmpty(stickyNote))
                                {
                                    p.Append($" [Ghi chú nổi: {stickyNote}] ")
                                     .Font(new Xceed.Document.NET.Font("Arial"))
                                     .FontSize(11D)
                                     .Italic()
                                     .Color(Xceed.Drawing.Color.DarkMagenta);
                                }
                            }
                        }
                    }
                }
                else
                {
                    doc.InsertParagraph("Không có nội dung văn bản.")
                        .Font(new Xceed.Document.NET.Font("Arial"))
                        .FontSize(11D)
                        .Italic()
                        .SpacingAfter(20D);
                }

                // Section 2: Highlights and notes
                var annotationsHeading = doc.InsertParagraph();
                annotationsHeading.Append("II. TỪ VỰNG HIGHLIGHT & GHI CHÚ HỌC TẬP")
                    .Font(new Xceed.Document.NET.Font("Arial"))
                    .FontSize(14D)
                    .Bold()
                    .Color(Xceed.Drawing.Color.Blue);
                annotationsHeading.SpacingAfter(10D);

                if (!string.IsNullOrEmpty(documentEntity.AnnotationsJson))
                {
                    try
                    {
                        var options = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                        var annotations = System.Text.Json.JsonSerializer.Deserialize<AnnotationsDto>(documentEntity.AnnotationsJson, options);
                        
                        var allIndices = new System.Collections.Generic.HashSet<string>();
                        if (annotations?.Highlights != null) 
                            foreach (var k in annotations.Highlights.Keys) allIndices.Add(k);
                        if (annotations?.TextNotes != null) 
                            foreach (var k in annotations.TextNotes.Keys) allIndices.Add(k);
                        if (annotations?.StickyNotes != null) 
                            foreach (var k in annotations.StickyNotes.Keys) allIndices.Add(k);

                        if (allIndices.Count > 0)
                        {
                            var table = doc.AddTable(allIndices.Count + 1, 4);
                            table.Alignment = Xceed.Document.NET.Alignment.center;
                            
                            table.Rows[0].Cells[0].Paragraphs[0].Append("STT").Bold();
                            table.Rows[0].Cells[1].Paragraphs[0].Append("Từ vựng / Cụm từ").Bold();
                            table.Rows[0].Cells[2].Paragraphs[0].Append("Phân loại màu").Bold();
                            table.Rows[0].Cells[3].Paragraphs[0].Append("Ghi chú cá nhân").Bold();

                            int rowIdx = 1;
                            foreach (var key in allIndices)
                            {
                                if (int.TryParse(key, out int index) && index >= 0 && index < segments.Count)
                                {
                                    var word = segments[index];
                                    
                                    string? color = null;
                                    if (annotations != null && annotations.Highlights != null)
                                        annotations.Highlights.TryGetValue(key, out color);

                                    string? textNote = null;
                                    if (annotations != null && annotations.TextNotes != null)
                                        annotations.TextNotes.TryGetValue(key, out textNote);

                                    string? stickyNote = null;
                                    if (annotations != null && annotations.StickyNotes != null)
                                        annotations.StickyNotes.TryGetValue(key, out stickyNote);

                                    string colorName = "Không màu";
                                    if (color == "#fef08a") colorName = "Vàng (HSK mới)";
                                    else if (color == "#bbf7d0") colorName = "Xanh lá (Đã hiểu)";
                                    else if (color == "#bfdbfe") colorName = "Xanh dương (Quan trọng)";
                                    else if (color == "#e9d5ff") colorName = "Tím (Ngữ pháp)";
                                    else if (color == "#fbcfe8") colorName = "Hồng (Thành ngữ)";
                                    else if (color == "#fecaca") colorName = "Đỏ (Xem lại)";
                                    else if (!string.IsNullOrEmpty(color)) colorName = $"Tự chọn ({color})";

                                    var noteSummary = new System.Collections.Generic.List<string>();
                                    if (!string.IsNullOrEmpty(textNote)) noteSummary.Add($"Ghi chú: {textNote}");
                                    if (!string.IsNullOrEmpty(stickyNote)) noteSummary.Add($"Ghi chú nổi: {stickyNote}");
                                    var notesText = string.Join("; ", noteSummary);

                                    table.Rows[rowIdx].Cells[0].Paragraphs[0].Append(rowIdx.ToString());
                                    table.Rows[rowIdx].Cells[1].Paragraphs[0].Append(word).Bold();
                                    table.Rows[rowIdx].Cells[2].Paragraphs[0].Append(colorName);
                                    table.Rows[rowIdx].Cells[3].Paragraphs[0].Append(string.IsNullOrEmpty(notesText) ? "_" : notesText);
                                    
                                    rowIdx++;
                                }
                            }
                            doc.InsertTable(table);
                            doc.InsertParagraph().SpacingAfter(20D);
                        }
                        else
                        {
                            doc.InsertParagraph("Không có highlights hoặc ghi chú nào.")
                                .Font(new Xceed.Document.NET.Font("Arial"))
                                .FontSize(11D)
                                .Italic()
                                .SpacingAfter(20D);
                        }
                    }
                    catch
                    {
                        doc.InsertParagraph("Lỗi giải nén dữ liệu ghi chú.")
                            .Font(new Xceed.Document.NET.Font("Arial"))
                            .FontSize(11D)
                            .Italic()
                            .SpacingAfter(20D);
                    }
                }
                else
                {
                    doc.InsertParagraph("Không có ghi chú nào được tạo.")
                        .Font(new Xceed.Document.NET.Font("Arial"))
                        .FontSize(11D)
                        .Italic()
                        .SpacingAfter(20D);
                }

                doc.Save();
            }

            var bytes = memoryStream.ToArray();
            return File(bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", $"{docTitle}.docx");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDocument(long id)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!long.TryParse(userIdString, out long userId))
            {
                userId = 1; 
            }

            var document = await _db.Documents
                .Include(d => d.DocumentPages)
                .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);

            if (document == null)
            {
                return NotFound(new { error = "Tài liệu không tồn tại hoặc không thuộc quyền sở hữu của bạn." });
            }

            // 1. Clear references in UserVocabularies
            var linkedVocabs = await _db.UserVocabularies.Where(v => v.SourceDocumentId == id).ToListAsync();
            foreach (var v in linkedVocabs)
            {
                v.SourceDocumentId = null;
            }

            // 2. Clear references in FlashcardDecks
            var linkedDecks = await _db.FlashcardDecks.Where(d => d.DocumentId == id).ToListAsync();
            foreach (var d in linkedDecks)
            {
                d.DocumentId = null;
            }

            // 3. Delete DocumentReadingProgress entries
            var progressEntries = await _db.DocumentReadingProgresses.Where(p => p.DocumentId == id).ToListAsync();
            _db.DocumentReadingProgresses.RemoveRange(progressEntries);

            // 4. Delete DocumentPages
            _db.DocumentPages.RemoveRange(document.DocumentPages);

            // 5. Delete the Document
            _db.Documents.Remove(document);

            await _db.SaveChangesAsync();

            return Ok(new { message = "Xóa tài liệu thành công." });
        }
    }

public class SaveAnnotationsRequest
{
    public string? AnnotationsJson { get; set; }
}

public class UpdateProgressRequest
{
    public int LastPage { get; set; }
    public decimal ProgressPercent { get; set; }
    public int ReadingMinutes { get; set; }
}

public class AnnotationsDto
{
    public System.Text.Json.Nodes.JsonNode? PencilStrokes { get; set; }
    public Dictionary<string, string>? Highlights { get; set; }
    public Dictionary<string, HighlightRangeDto>? HighlightRanges { get; set; }
    public Dictionary<string, string>? TextNotes { get; set; }
    public Dictionary<string, string>? StickyNotes { get; set; }
}

public class HighlightRangeDto
{
    public string? Id { get; set; }
    public string? SelectedText { get; set; }
    public int StartOffset { get; set; }
    public int EndOffset { get; set; }
    public string? Color { get; set; }
    public string? NoteContent { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
