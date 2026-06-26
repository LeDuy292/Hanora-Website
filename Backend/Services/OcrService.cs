using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;
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
                var (text, pdfBytes, paddleError) = ExtractWithPaddleOcrAndPdf(memoryStream, fileName);
                
                if (!string.IsNullOrEmpty(paddleError))
                {
                    return (null, null, $"PaddleOCR Error: {paddleError}");
                }

                if (string.IsNullOrWhiteSpace(text) || text.Trim().Length < 5)
                {
                    _logger.LogInformation("PaddleOCR extraction failed or yielded little text. Rejecting image.");
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

    private (string? text, byte[]? pdfBytes, string? errorMessage) ExtractWithPaddleOcrAndPdf(Stream fileStream, string fileName)
    {
        try
        {
            using var ms = new MemoryStream();
            fileStream.CopyTo(ms);
            var bytes = ms.ToArray();

            string text = "";
            byte[]? pdfBytes = null;

            // Run PaddleOCR
            using var img = OpenCvSharp.Cv2.ImDecode(bytes, OpenCvSharp.ImreadModes.Color);
            var model = Sdcb.PaddleOCR.Models.Local.LocalFullModels.ChineseV5;
            using var all = new Sdcb.PaddleOCR.PaddleOcrAll(model, config =>
            {
                config.UseGpu = false;
            });
            
            var result = all.Run(img);
            text = result.Text;

            // Generate Searchable PDF using iText7
            using var outMs = new MemoryStream();
            using (var writer = new iText.Kernel.Pdf.PdfWriter(outMs))
            {
                using var pdf = new iText.Kernel.Pdf.PdfDocument(writer);
                var imageData = iText.IO.Image.ImageDataFactory.Create(bytes);
                float imgWidth = imageData.GetWidth();
                float imgHeight = imageData.GetHeight();

                var page = pdf.AddNewPage(new iText.Kernel.Geom.PageSize(imgWidth, imgHeight));
                var canvas = new iText.Kernel.Pdf.Canvas.PdfCanvas(page);
                
                // Draw image at (0, 0)
                canvas.AddImageAt(imageData, 0, 0, false);

                // Setup font (use standard font for cross-platform compatibility)
                var font = iText.Kernel.Font.PdfFontFactory.CreateFont("STSong-Light", "UniGB-UTF16-H", iText.Kernel.Font.PdfFontFactory.EmbeddingStrategy.PREFER_NOT_EMBEDDED);

                foreach (var region in result.Regions)
                {
                    // PDF origin (0,0) is bottom-left. OCR origin is top-left.
                    var bounds = region.Rect.BoundingRect();
                    float rectX = bounds.X;
                    float rectY = imgHeight - bounds.Y - bounds.Height;
                    float rectWidth = bounds.Width;
                    float rectHeight = bounds.Height;

                    if (rectHeight <= 0 || string.IsNullOrEmpty(region.Text)) continue;

                    // Calculate width per character assuming monospaced (typical for Chinese)
                    float charWidth = rectWidth / region.Text.Length;

                    for (int i = 0; i < region.Text.Length; i++)
                    {
                        canvas.SaveState();
                        canvas.BeginText();
                        
                        // Set invisible text mode (TextRenderingMode.INVISIBLE)
                        canvas.SetTextRenderingMode(iText.Kernel.Pdf.Canvas.PdfCanvasConstants.TextRenderingMode.INVISIBLE);
                        
                        // Set font and size to match bounding box height
                        canvas.SetFontAndSize(font, rectHeight);
                        
                        string singleChar = region.Text[i].ToString();
                        float singleCharWidth = font.GetWidth(singleChar, rectHeight);
                        
                        // Calculate horizontal scaling to fit the character width
                        if (singleCharWidth > 0)
                        {
                            float scale = (charWidth / singleCharWidth) * 100f;
                            canvas.SetHorizontalScaling(scale);
                        }

                        // Move text cursor to the character's specific position
                        canvas.MoveText(rectX + (i * charWidth), rectY);
                        canvas.ShowText(singleChar);
                        
                        canvas.EndText();
                        canvas.RestoreState();
                    }
                }
            }
            
            pdfBytes = outMs.ToArray();

            return (text, pdfBytes, null);
        }
        catch (Exception ex)
        {
            var fullError = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
            _logger.LogWarning(ex, "PaddleOCR failed to extract text and generate PDF.");
            return (null, null, fullError);
        }
    }
}
