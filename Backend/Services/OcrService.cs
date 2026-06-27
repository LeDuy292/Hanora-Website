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
        _httpClient.Timeout = TimeSpan.FromMinutes(2);
    }

    public async Task<(string? ExtractedText, byte[]? GeneratedPdfBytes, string? ErrorMessage)> ExtractTextAndPdfAsync(Stream fileStream, string fileName, string contentType)
    {
        try
        {
            using var memoryStream = new MemoryStream();
            await fileStream.CopyToAsync(memoryStream);
            memoryStream.Position = 0;

            if (IsTextFile(fileName, contentType))
            {
                using var reader = new StreamReader(memoryStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
                var text = await reader.ReadToEndAsync();
                return (text, null, null);
            }

            if (contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase)
                || fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
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

            if (contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                var (text, ocrError) = await ExtractWithAzureOcrAsync(memoryStream.ToArray());

                if (!string.IsNullOrEmpty(ocrError))
                {
                    return (null, null, $"Azure OCR Error: {ocrError}");
                }

                if (string.IsNullOrWhiteSpace(text) || text.Trim().Length < 5)
                {
                    _logger.LogInformation("Azure OCR extraction failed or yielded little text. Rejecting image.");
                    return (null, null, "Ảnh quá mờ không thể dịch thuật được.");
                }

                return (text, null, null);
            }

            return (null, null, "Định dạng file không được hỗ trợ.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting text.");
            return (null, null, "Đã xảy ra lỗi trong quá trình xử lý tài liệu.");
        }
    }

    private static bool IsTextFile(string fileName, string contentType)
    {
        return contentType.StartsWith("text/", StringComparison.OrdinalIgnoreCase)
            || fileName.EndsWith(".txt", StringComparison.OrdinalIgnoreCase);
    }

    private string ExtractFromPdf(Stream fileStream)
    {
        var pages = new List<string>();
        try
        {
            using var document = PdfDocument.Open(fileStream);
            foreach (var page in document.GetPages())
            {
                var rawText = page.Text ?? "";
                // Normalize line endings within a page: single \n per line, \n\n between paragraphs
                // PdfPig returns text as one block; we detect paragraph boundaries by blank lines or
                // short lines (headings/titles) that are not sentence continuations.
                var lines = rawText
                    .Replace("\r\n", "\n")
                    .Replace('\r', '\n')
                    .Split('\n');

                var sb = new StringBuilder();
                for (int i = 0; i < lines.Length; i++)
                {
                    var line = lines[i].Trim();
                    if (string.IsNullOrEmpty(line))
                    {
                        // blank line → paragraph break
                        if (sb.Length > 0 && !sb.ToString().EndsWith("\n\n"))
                            sb.Append("\n\n");
                    }
                    else
                    {
                        sb.AppendLine(line);
                    }
                }
                var pageText = sb.ToString().Trim();
                if (!string.IsNullOrEmpty(pageText))
                    pages.Add(pageText);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "PdfPig failed to extract text.");
        }
        // Join pages with double newline to mark page breaks as paragraph breaks
        return string.Join("\n\n", pages);
    }


    private async Task<(string? text, string? errorMessage)> ExtractWithAzureOcrAsync(byte[] bytes)
    {
        try
        {
            var endpoint = _config["AzureComputerVision:Endpoint"]?.Trim().TrimEnd('/')
                ?? throw new InvalidOperationException("AzureComputerVision:Endpoint is not configured.");
            var key = _config["AzureComputerVision:Key"]?.Trim()
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
                return (null, $"Azure API Error ({(int)response.StatusCode}): {responseBody}");
            }

            using var doc = JsonDocument.Parse(responseBody);
            var readResult = doc.RootElement.GetProperty("readResult");
            var blocks = readResult.GetProperty("blocks");

            var textBuilder = new StringBuilder();

            foreach (var block in blocks.EnumerateArray())
            {
                foreach (var line in block.GetProperty("lines").EnumerateArray())
                {
                    var lineText = line.GetProperty("text").GetString() ?? "";
                    textBuilder.AppendLine(lineText);
                }
            }

            return (textBuilder.ToString().Trim(), null);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Azure Computer Vision API request failed.");
            return (null, $"Azure API Error: {ex.Message}");
        }
        catch (Exception ex)
        {
            var fullError = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
            _logger.LogWarning(ex, "Azure OCR failed to extract text.");
            return (null, fullError);
        }
    }
}
