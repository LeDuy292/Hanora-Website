using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;
using Tesseract;
using UglyToad.PdfPig;

namespace Services;

public class OcrService : IOcrService
{
    private readonly IConfiguration _config;
    private readonly ILogger<OcrService> _logger;
    private readonly HttpClient _httpClient;

    public OcrService(IConfiguration config, ILogger<OcrService> logger, HttpClient httpClient)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClient;
    }

    public async Task<(string? ExtractedText, byte[]? GeneratedPdfBytes, string? ErrorMessage)> ExtractTextAndPdfAsync(Stream fileStream, string fileName, string contentType)
    {
        try
        {
            using var memoryStream = new MemoryStream();
            await fileStream.CopyToAsync(memoryStream);
            memoryStream.Position = 0;

            if (contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase))
            {
                var text = ExtractFromPdf(memoryStream);
                var chineseCharCount = System.Text.RegularExpressions.Regex.Matches(text ?? "", @"\p{IsCJKUnifiedIdeographs}").Count;
                
                if (!string.IsNullOrWhiteSpace(text) && chineseCharCount > 10)
                {
                    return (text, null, null);
                }
                
                _logger.LogInformation("PDF seems to be scanned or contains unmapped CJK fonts. Rejecting.");
                return (null, null, "File PDF có định dạng chữ bất thường hoặc quá mờ.");
            }
            else if (contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                var (text, pdfBytes, tesseractError) = ExtractWithTesseractAndPdf(memoryStream, fileName);
                
                if (!string.IsNullOrEmpty(tesseractError))
                {
                    return (null, null, $"Tesseract Error: {tesseractError}");
                }

                if (string.IsNullOrWhiteSpace(text) || text.Trim().Length < 5)
                {
                    _logger.LogInformation("Tesseract extraction failed or yielded little text. Rejecting image.");
                    return (null, null, "Ảnh quá mờ không thể dịch thuật được.");
                }

                return (text, pdfBytes, null);
            }

            return (null, null, "Định dạng file không được hỗ trợ.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting text.");
            return (null, null, "Đã xảy ra lỗi trong quá trình xử lý tài liệu.");
        }
    }

    private string ExtractFromPdf(Stream fileStream)
    {
        var text = new StringBuilder();
        try
        {
            using var document = UglyToad.PdfPig.PdfDocument.Open(fileStream);
            foreach (var page in document.GetPages())
            {
                text.AppendLine(page.Text);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "PdfPig failed to extract text.");
        }
        return text.ToString();
    }

    private (string? text, byte[]? pdfBytes, string? errorMessage) ExtractWithTesseractAndPdf(Stream fileStream, string fileName)
    {
        try
        {
            using var ms = new MemoryStream();
            fileStream.CopyTo(ms);
            var bytes = ms.ToArray();

            var tessDataPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "tessdata");
            if (!Directory.Exists(tessDataPath)) 
            {
                tessDataPath = Path.Combine(Directory.GetCurrentDirectory(), "tessdata");
            }

            string text = "";
            var tempPdfPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            
            using (var renderer = ResultRenderer.CreatePdfRenderer(tempPdfPath, tessDataPath, false))
            {
                using (renderer.BeginDocument(fileName))
                {
                    using var engine = new TesseractEngine(tessDataPath, "chi_sim", EngineMode.Default);
                    using var img = Pix.LoadFromMemory(bytes);
                    using var page = engine.Process(img);
                    
                    renderer.AddPage(page);
                    text = page.GetText();
                }
            }

            byte[]? pdfBytes = null;
            if (File.Exists(tempPdfPath + ".pdf"))
            {
                pdfBytes = File.ReadAllBytes(tempPdfPath + ".pdf");
                File.Delete(tempPdfPath + ".pdf");
            }

            return (text, pdfBytes, null);
        }
        catch (Exception ex)
        {
            var fullError = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
            _logger.LogWarning(ex, "Tesseract failed to extract text and pdf.");
            return (null, null, fullError);
        }
    }
}
