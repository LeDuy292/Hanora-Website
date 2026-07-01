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

    public async Task<(string? Text, List<Services.DTOs.PageLinesDto>? Pages, string? ErrorMessage)> ExtractLayoutAsync(Stream fileStream, string fileName, string contentType)
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
                var pages = ExtractLayoutFromPdf(memoryStream);
                var text = string.Join("\n\n", pages.SelectMany(p => p.Lines).Select(l => l.Text));
                var chineseCharCount = System.Text.RegularExpressions.Regex.Matches(text ?? "", @"\p{IsCJKUnifiedIdeographs}").Count;

                if (!string.IsNullOrWhiteSpace(text) && chineseCharCount > 10)
                {
                    return (text, pages, null);
                }

                _logger.LogInformation("PDF seems to be scanned or contains unmapped CJK fonts. Rejecting.");
                return (null, null, "File PDF có định dạng chữ bất thường hoặc quá mờ.");
            }

            if (contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                var (text, pages, ocrError) = await ExtractWithAzureOcrLayoutAsync(memoryStream.ToArray());

                if (!string.IsNullOrEmpty(ocrError))
                {
                    return (null, null, $"Azure OCR Error: {ocrError}");
                }

                if (string.IsNullOrWhiteSpace(text) || text.Trim().Length < 5)
                {
                    _logger.LogInformation("Azure OCR extraction failed or yielded little text. Rejecting image.");
                    return (null, null, "Ảnh quá mờ không thể dịch thuật được.");
                }

                return (text, pages, null);
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

    private List<Services.DTOs.PageLinesDto> ExtractLayoutFromPdf(Stream fileStream)
    {
        var pagesDto = new List<Services.DTOs.PageLinesDto>();
        try
        {
            using var document = PdfDocument.Open(fileStream);
            foreach (var page in document.GetPages())
            {
                var pageDto = new Services.DTOs.PageLinesDto { PageNumber = page.Number };
                var words = page.GetWords().ToList();
                
                // Group words by approximate Y coordinate (line)
                var lines = words
                    .GroupBy(w => Math.Round(w.BoundingBox.Bottom, 0))
                    .OrderByDescending(g => g.Key)
                    .ToList();

                foreach (var lineGroup in lines)
                {
                    var lineWords = lineGroup.OrderBy(w => w.BoundingBox.Left).ToList();
                    if (!lineWords.Any()) continue;

                    var minX = lineWords.Min(w => w.BoundingBox.Left);
                    var maxX = lineWords.Max(w => w.BoundingBox.Right);
                    var minY = lineWords.Min(w => w.BoundingBox.Bottom);
                    var maxY = lineWords.Max(w => w.BoundingBox.Top);

                    var lineDto = new Services.DTOs.OcrLineDto
                    {
                        Text = string.Join(" ", lineWords.Select(w => w.Text)),
                        BoundingBox = new Services.DTOs.BoundingBoxDto
                        {
                            X = minX,
                            Y = minY,
                            Width = maxX - minX,
                            Height = maxY - minY
                        },
                        Words = lineWords.Select(w => new Services.DTOs.OcrWordDto
                        {
                            Text = w.Text,
                            BoundingBox = new Services.DTOs.BoundingBoxDto
                            {
                                X = w.BoundingBox.Left,
                                Y = w.BoundingBox.Bottom,
                                Width = w.BoundingBox.Width,
                                Height = w.BoundingBox.Height
                            }
                        }).ToList()
                    };
                    pageDto.Lines.Add(lineDto);
                }
                
                if (pageDto.Lines.Any())
                {
                    pagesDto.Add(pageDto);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "PdfPig failed to extract layout.");
        }
        return pagesDto;
    }


    private async Task<(string? text, List<Services.DTOs.PageLinesDto>? pages, string? errorMessage)> ExtractWithAzureOcrLayoutAsync(byte[] bytes)
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
                return (null, null, $"Azure API Error ({(int)response.StatusCode}): {responseBody}");
            }

            using var doc = JsonDocument.Parse(responseBody);
            var readResult = doc.RootElement.GetProperty("readResult");
            var blocks = readResult.GetProperty("blocks");

            var textBuilder = new StringBuilder();
            var pagesDto = new List<Services.DTOs.PageLinesDto>();
            var pageDto = new Services.DTOs.PageLinesDto { PageNumber = 1 };

            foreach (var block in blocks.EnumerateArray())
            {
                foreach (var line in block.GetProperty("lines").EnumerateArray())
                {
                    var lineText = line.GetProperty("text").GetString() ?? "";
                    textBuilder.AppendLine(lineText);

                    var boundingPoly = line.GetProperty("boundingPolygon").EnumerateArray().Select(x => x.GetProperty("x").GetDouble()).ToArray();
                    var boundingPolyY = line.GetProperty("boundingPolygon").EnumerateArray().Select(x => x.GetProperty("y").GetDouble()).ToArray();
                    var minX = boundingPoly.Min();
                    var maxX = boundingPoly.Max();
                    var minY = boundingPolyY.Min();
                    var maxY = boundingPolyY.Max();

                    var lineDto = new Services.DTOs.OcrLineDto
                    {
                        Text = lineText,
                        BoundingBox = new Services.DTOs.BoundingBoxDto
                        {
                            X = minX,
                            Y = minY,
                            Width = maxX - minX,
                            Height = maxY - minY
                        }
                    };

                    if (line.TryGetProperty("words", out var wordsProp))
                    {
                        foreach (var word in wordsProp.EnumerateArray())
                        {
                            var wPolyX = word.GetProperty("boundingPolygon").EnumerateArray().Select(x => x.GetProperty("x").GetDouble()).ToArray();
                            var wPolyY = word.GetProperty("boundingPolygon").EnumerateArray().Select(x => x.GetProperty("y").GetDouble()).ToArray();
                            lineDto.Words.Add(new Services.DTOs.OcrWordDto
                            {
                                Text = word.GetProperty("text").GetString() ?? "",
                                BoundingBox = new Services.DTOs.BoundingBoxDto
                                {
                                    X = wPolyX.Min(),
                                    Y = wPolyY.Min(),
                                    Width = wPolyX.Max() - wPolyX.Min(),
                                    Height = wPolyY.Max() - wPolyY.Min()
                                }
                            });
                        }
                    }
                    pageDto.Lines.Add(lineDto);
                }
            }
            if (pageDto.Lines.Any())
            {
                pagesDto.Add(pageDto);
            }

            return (textBuilder.ToString().Trim(), pagesDto, null);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Azure Computer Vision API request failed.");
            return (null, null, $"Azure API Error: {ex.Message}");
        }
        catch (Exception ex)
        {
            var fullError = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
            _logger.LogWarning(ex, "Azure OCR failed to extract text.");
            return (null, null, fullError);
        }
    }
}
