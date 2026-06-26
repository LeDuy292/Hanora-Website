using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;
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

            // --- Azure Computer Vision Read API (REST) ---
            var endpoint = _config["AzureComputerVision:Endpoint"]?.TrimEnd('/')
                ?? throw new InvalidOperationException("AzureComputerVision:Endpoint is not configured.");
            var key = _config["AzureComputerVision:Key"] 
                ?? throw new InvalidOperationException("AzureComputerVision:Key is not configured.");

            var requestUrl = $"{endpoint}/computervision/imageanalysis:analyze?api-version=2024-02-01&features=read";

            using var request = new HttpRequestMessage(HttpMethod.Post, requestUrl);
            request.Headers.Add("Ocp-Apim-Subscription-Key", key);
            request.Content = new ByteArrayContent(bytes);
            request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");

            var response = await _httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Azure Computer Vision API error: {StatusCode} {Body}", response.StatusCode, responseBody);
                return (null, null, $"Azure API Error ({(int)response.StatusCode}): {responseBody}");
            }

            // Parse the JSON response
            using var doc = JsonDocument.Parse(responseBody);
            var readResult = doc.RootElement.GetProperty("readResult");
            var blocks = readResult.GetProperty("blocks");

            // Build full text from all blocks/lines
            var textBuilder = new StringBuilder();
            var lineInfos = new List<(string Text, float X, float Y, float Width, float Height)>();

            foreach (var block in blocks.EnumerateArray())
            {
                foreach (var line in block.GetProperty("lines").EnumerateArray())
                {
                    var lineText = line.GetProperty("text").GetString() ?? "";
                    textBuilder.AppendLine(lineText);

                    // Parse bounding polygon [x0,y0, x1,y1, x2,y2, x3,y3]
                    var polygon = line.GetProperty("boundingPolygon").EnumerateArray().ToList();
                    if (polygon.Count >= 4)
                    {
                        float x0 = polygon[0].GetProperty("x").GetSingle();
                        float y0 = polygon[0].GetProperty("y").GetSingle();
                        float x1 = polygon[1].GetProperty("x").GetSingle();
                        float y3 = polygon[3].GetProperty("y").GetSingle();

                        float rectWidth = Math.Abs(x1 - x0);
                        float rectHeight = Math.Abs(y3 - y0);
                        if (rectWidth > 0 && rectHeight > 0)
                        {
                            lineInfos.Add((lineText, x0, y0, rectWidth, rectHeight));
                        }
                    }
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

                foreach (var lineInfo in lineInfos)
                {
                    if (string.IsNullOrEmpty(lineInfo.Text)) continue;

                    // PDF origin (0,0) is bottom-left. Azure OCR origin is top-left.
                    float pdfY = imgHeight - lineInfo.Y - lineInfo.Height;

                    // Calculate width per character
                    float charWidth = lineInfo.Width / lineInfo.Text.Length;

                    for (int i = 0; i < lineInfo.Text.Length; i++)
                    {
                        canvas.SaveState();
                        canvas.BeginText();
                        
                        // Set invisible text mode (TextRenderingMode.INVISIBLE)
                        canvas.SetTextRenderingMode(iText.Kernel.Pdf.Canvas.PdfCanvasConstants.TextRenderingMode.INVISIBLE);
                        
                        // Set font and size to match bounding box height
                        canvas.SetFontAndSize(font, lineInfo.Height);
                        
                        string singleChar = lineInfo.Text[i].ToString();
                        float singleCharWidth = font.GetWidth(singleChar, lineInfo.Height);
                        
                        // Calculate horizontal scaling to fit the character width
                        if (singleCharWidth > 0)
                        {
                            float scale = (charWidth / singleCharWidth) * 100f;
                            canvas.SetHorizontalScaling(scale);
                        }

                        // Move text cursor to the character's specific position
                        canvas.MoveText(lineInfo.X + (i * charWidth), pdfY);
                        canvas.ShowText(singleChar);
                        
                        canvas.EndText();
                        canvas.RestoreState();
                    }
                }
            }
            
            pdfBytes = outMs.ToArray();

            return (text, pdfBytes, null);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Azure Computer Vision API request failed.");
            return (null, null, $"Azure API Error: {ex.Message}");
        }
        catch (Exception ex)
        {
            var fullError = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
            _logger.LogWarning(ex, "Azure OCR failed to extract text and generate PDF.");
            return (null, null, fullError);
        }
    }
}
