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

    public async Task<string> ExtractTextAsync(Stream fileStream, string fileName, string contentType)
    {
        try
        {
            using var memoryStream = new MemoryStream();
            await fileStream.CopyToAsync(memoryStream);
            memoryStream.Position = 0;

            if (contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase))
            {
                var text = ExtractFromPdf(memoryStream);
                var chineseCharCount = System.Text.RegularExpressions.Regex.Matches(text, @"\p{IsCJKUnifiedIdeographs}").Count;
                
                if (!string.IsNullOrWhiteSpace(text) && chineseCharCount > 10)
                {
                    return text;
                }
                
                _logger.LogInformation("PDF seems to be scanned or contains unmapped CJK fonts. Falling back to Gemini.");
                memoryStream.Position = 0;
                return await ExtractWithGeminiAsync(memoryStream, contentType);
            }
            else if (contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                var text = ExtractWithTesseract(memoryStream);
                if (!string.IsNullOrWhiteSpace(text) && text.Trim().Length > 5)
                {
                    return text;
                }

                _logger.LogInformation("Tesseract extraction failed or yielded little text. Falling back to Gemini.");
                memoryStream.Position = 0;
                return await ExtractWithGeminiAsync(memoryStream, contentType);
            }

            return string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting text.");
            throw;
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

    private string ExtractWithTesseract(Stream fileStream)
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

            using var engine = new TesseractEngine(tessDataPath, "chi_sim", EngineMode.Default);
            using var img = Pix.LoadFromMemory(bytes);
            using var page = engine.Process(img);
            
            return page.GetText();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Tesseract failed to extract text.");
            return string.Empty;
        }
    }

    private async Task<string> ExtractWithGeminiAsync(Stream fileStream, string contentType)
    {
        try
        {
            using var ms = new MemoryStream();
            await fileStream.CopyToAsync(ms);
            var base64Data = Convert.ToBase64String(ms.ToArray());
            var apiKey = _config["Gemini:ApiKey"];
            if (string.IsNullOrEmpty(apiKey)) return string.Empty;

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

            var payload = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new { text = "Extract all Chinese text from this document. Provide only the extracted Chinese text without any markdown or conversational filler." },
                            new
                            {
                                inline_data = new
                                {
                                    mime_type = contentType,
                                    data = base64Data
                                }
                            }
                        }
                    }
                }
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini API returned {StatusCode}", response.StatusCode);
                return string.Empty;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);
            
            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            return text ?? string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini OCR failed.");
            return string.Empty;
        }
    }
}
