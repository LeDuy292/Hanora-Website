using Azure;
using Azure.AI.Vision.ImageAnalysis;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text;
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
                var (text, pdfBytes, ocrError) = await ExtractWithAzureOcrAndPdfAsync(memoryStream, fileName);
                
                if (!string.IsNullOrEmpty(ocrError))
                {
                    return (null, null, $"Azure OCR Error: {ocrError}");
                }

                if (string.IsNullOrWhiteSpace(text) || text.Trim().Length < 5)
                {
                    _logger.LogInformation("Azure OCR extraction failed or yielded little text. Rejecting image.");
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

    private async Task<(string? text, byte[]? pdfBytes, string? errorMessage)> ExtractWithAzureOcrAndPdfAsync(Stream fileStream, string fileName)
    {
        try
        {
            using var ms = new MemoryStream();
            fileStream.CopyTo(ms);
            var bytes = ms.ToArray();

            // --- Azure Computer Vision Read API ---
            var endpoint = _config["AzureComputerVision:Endpoint"] 
                ?? throw new InvalidOperationException("AzureComputerVision:Endpoint is not configured.");
            var key = _config["AzureComputerVision:Key"] 
                ?? throw new InvalidOperationException("AzureComputerVision:Key is not configured.");

            var credential = new AzureKeyCredential(key);
            var client = new ImageAnalysisClient(new Uri(endpoint), credential);

            var imageData = BinaryData.FromBytes(bytes);
            var analysisResult = await client.AnalyzeAsync(
                imageData,
                VisualFeatures.Read);

            if (analysisResult?.Value?.Read == null)
            {
                return (null, null, "Azure Computer Vision returned no result.");
            }

            var readResult = analysisResult.Value.Read;

            // Build full text from all blocks/lines
            var textBuilder = new StringBuilder();
            foreach (var block in readResult.Blocks)
            {
                foreach (var line in block.Lines)
                {
                    textBuilder.AppendLine(line.Text);
                }
            }
            var text = textBuilder.ToString().Trim();

            // --- Generate Searchable PDF using iText7 ---
            byte[]? pdfBytes = null;
            using var outMs = new MemoryStream();
            using (var writer = new iText.Kernel.Pdf.PdfWriter(outMs))
            {
                using var pdf = new iText.Kernel.Pdf.PdfDocument(writer);
                var imageData2 = iText.IO.Image.ImageDataFactory.Create(bytes);
                float imgWidth = imageData2.GetWidth();
                float imgHeight = imageData2.GetHeight();

                var page = pdf.AddNewPage(new iText.Kernel.Geom.PageSize(imgWidth, imgHeight));
                var canvas = new iText.Kernel.Pdf.Canvas.PdfCanvas(page);
                
                // Draw image at (0, 0)
                canvas.AddImageAt(imageData2, 0, 0, false);

                // Setup font (use standard font for cross-platform compatibility)
                var font = iText.Kernel.Font.PdfFontFactory.CreateFont("STSong-Light", "UniGB-UTF16-H", iText.Kernel.Font.PdfFontFactory.EmbeddingStrategy.PREFER_NOT_EMBEDDED);

                foreach (var block in readResult.Blocks)
                {
                    foreach (var line in block.Lines)
                    {
                        if (string.IsNullOrEmpty(line.Text) || line.BoundingPolygon == null || line.BoundingPolygon.Count < 4)
                            continue;

                        // Azure returns bounding polygon as 4 points (top-left, top-right, bottom-right, bottom-left)
                        // Coordinates are in pixels from top-left origin
                        var points = line.BoundingPolygon;
                        float rectX = points[0].X;
                        float rectTopY = points[0].Y;
                        float rectWidth = points[1].X - points[0].X;
                        float rectHeight = points[3].Y - points[0].Y;

                        if (rectHeight <= 0) rectHeight = Math.Abs(points[2].Y - points[0].Y);
                        if (rectWidth <= 0) rectWidth = Math.Abs(points[2].X - points[0].X);

                        // PDF origin (0,0) is bottom-left. Azure OCR origin is top-left.
                        float pdfY = imgHeight - rectTopY - rectHeight;

                        // Calculate width per character
                        float charWidth = rectWidth / line.Text.Length;

                        for (int i = 0; i < line.Text.Length; i++)
                        {
                            canvas.SaveState();
                            canvas.BeginText();
                            
                            // Set invisible text mode (TextRenderingMode.INVISIBLE)
                            canvas.SetTextRenderingMode(iText.Kernel.Pdf.Canvas.PdfCanvasConstants.TextRenderingMode.INVISIBLE);
                            
                            // Set font and size to match bounding box height
                            canvas.SetFontAndSize(font, rectHeight);
                            
                            string singleChar = line.Text[i].ToString();
                            float singleCharWidth = font.GetWidth(singleChar, rectHeight);
                            
                            // Calculate horizontal scaling to fit the character width
                            if (singleCharWidth > 0)
                            {
                                float scale = (charWidth / singleCharWidth) * 100f;
                                canvas.SetHorizontalScaling(scale);
                            }

                            // Move text cursor to the character's specific position
                            canvas.MoveText(rectX + (i * charWidth), pdfY);
                            canvas.ShowText(singleChar);
                            
                            canvas.EndText();
                            canvas.RestoreState();
                        }
                    }
                }
            }
            
            pdfBytes = outMs.ToArray();

            return (text, pdfBytes, null);
        }
        catch (RequestFailedException ex)
        {
            _logger.LogWarning(ex, "Azure Computer Vision API request failed. Status: {Status}", ex.Status);
            return (null, null, $"Azure API Error ({ex.Status}): {ex.Message}");
        }
        catch (Exception ex)
        {
            var fullError = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
            _logger.LogWarning(ex, "Azure OCR failed to extract text and generate PDF.");
            return (null, null, fullError);
        }
    }
}
