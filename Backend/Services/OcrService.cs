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
                var pdfBytes = memoryStream.ToArray();
                var expectedPageCount = GetPdfPageCount(pdfBytes);
                var pages = ExtractLayoutFromPdf(new MemoryStream(pdfBytes));
                var text = string.Join(Environment.NewLine + Environment.NewLine, pages.SelectMany(p => p.Lines).Select(l => l.Text));
                var chineseCharCount = System.Text.RegularExpressions.Regex.Matches(text ?? "", @"\p{IsCJKUnifiedIdeographs}").Count;
                var extractedPageCount = pages.Select(p => p.PageNumber).Distinct().Count();

                var hasReliablePdfLayout = IsPdfLayoutReliable(pages);
                if (!string.IsNullOrWhiteSpace(text) && chineseCharCount > 10 && hasReliablePdfLayout && (expectedPageCount <= 0 || extractedPageCount >= expectedPageCount))
                {
                    return (text, pages, null);
                }

                _logger.LogInformation(
                    "PDF text extraction yielded incomplete layout ({Extracted}/{Expected}), unreliable boxes ({Reliable}), or little CJK text. Falling back to Azure Read OCR.",
                    extractedPageCount,
                    expectedPageCount,
                    hasReliablePdfLayout);
                var (ocrText, ocrPages, ocrError) = await ExtractPdfWithAzureReadLayoutAsync(pdfBytes, expectedPageCount);
                var ocrChineseCount = System.Text.RegularExpressions.Regex.Matches(ocrText ?? "", @"\p{IsCJKUnifiedIdeographs}").Count;

                if (string.IsNullOrWhiteSpace(ocrError) && !string.IsNullOrWhiteSpace(ocrText) && ocrChineseCount > 10)
                {
                    return (ocrText, ocrPages, null);
                }

                if (string.IsNullOrWhiteSpace(ocrError) && !string.IsNullOrWhiteSpace(ocrText))
                {
                    return (ocrText, ocrPages, null);
                }

                if (!string.IsNullOrWhiteSpace(text) || pages.Any())
                {
                    return (text, pages, null);
                }

                _logger.LogInformation("PDF OCR produced no readable text. Accepting original PDF for visual reading. Error: {Error}", ocrError);
                return (string.Empty, new List<Services.DTOs.PageLinesDto>(), null);
            }
            if (contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                var (text, pages, ocrError) = await ExtractWithAzureOcrLayoutAsync(memoryStream.ToArray());

                if (!string.IsNullOrEmpty(ocrError))
                {
                    _logger.LogInformation("Image OCR failed. Accepting original image for visual reading. Error: {Error}", ocrError);
                    return (string.Empty, new List<Services.DTOs.PageLinesDto>(), null);
                }

                if (string.IsNullOrWhiteSpace(text) || text.Trim().Length < 5)
                {
                    _logger.LogInformation("Image OCR yielded little text. Accepting original image for visual reading.");
                    return (text ?? string.Empty, pages ?? new List<Services.DTOs.PageLinesDto>(), null);
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

    private int GetPdfPageCount(byte[] bytes)
    {
        try
        {
            using var stream = new MemoryStream(bytes);
            using var document = PdfDocument.Open(stream);
            return document.NumberOfPages;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to count PDF pages.");
            return 0;
        }
    }

    private List<Services.DTOs.PageLinesDto> ExtractLayoutFromPdf(Stream fileStream)
    {
        var pagesDto = new List<Services.DTOs.PageLinesDto>();
        try
        {
            using var document = PdfDocument.Open(fileStream);
            foreach (var page in document.GetPages())
            {
                var pageDto = new Services.DTOs.PageLinesDto { PageNumber = page.Number, Width = page.Width, Height = page.Height, Unit = "point", Angle = 0 };
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
                            Y = page.Height - maxY,
                            Width = maxX - minX,
                            Height = maxY - minY
                        },
                        Words = lineWords.Select(w => new Services.DTOs.OcrWordDto
                        {
                            Text = w.Text,
                            BoundingBox = new Services.DTOs.BoundingBoxDto
                            {
                                X = w.BoundingBox.Left,
                                Y = page.Height - w.BoundingBox.Top,
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

    private static bool IsPdfLayoutReliable(List<Services.DTOs.PageLinesDto> pages)
    {
        if (pages.Count == 0) return false;

        var hanziWords = pages
            .SelectMany(p => p.Lines)
            .SelectMany(l => l.Words)
            .Where(w => HasCjk(w.Text) && w.BoundingBox != null)
            .ToList();

        if (hanziWords.Count == 0) return false;

        var suspiciousCount = hanziWords.Count(w =>
        {
            var box = w.BoundingBox!;
            var cjkCount = Math.Max(1, CountCjk(w.Text));
            var expectedMaxWidth = Math.Max(box.Height * cjkCount * 2.05, box.Height * 2.4);
            return box.Width <= 0 || box.Height <= 0 || box.Width > expectedMaxWidth;
        });

        var tolerated = Math.Max(4, (int)Math.Ceiling(hanziWords.Count * 0.12));
        return suspiciousCount <= tolerated;
    }

    private static bool HasCjk(string? text)
    {
        if (string.IsNullOrEmpty(text)) return false;
        return text.Any(ch => ch >= '\u3400' && ch <= '\u9fff');
    }

    private static int CountCjk(string? text)
    {
        if (string.IsNullOrEmpty(text)) return 0;
        return text.Count(ch => ch >= '\u3400' && ch <= '\u9fff');
    }


    public async Task<(Services.DTOs.PageLinesDto? Page, string? ErrorMessage)> ExtractPdfPageLayoutAsync(Stream fileStream, int pageNumber)
    {
        if (pageNumber < 1)
        {
            return (null, "Page number must be greater than 0.");
        }

        try
        {
            using var memoryStream = new MemoryStream();
            await fileStream.CopyToAsync(memoryStream);
            var bytes = memoryStream.ToArray();

            var endpoint = _config["AzureComputerVision:Endpoint"]?.Trim().TrimEnd('/')
                ?? throw new InvalidOperationException("AzureComputerVision:Endpoint is not configured.");
            var key = _config["AzureComputerVision:Key"]?.Trim()
                ?? throw new InvalidOperationException("AzureComputerVision:Key is not configured.");

            byte[] singlePageBytes;
            try
            {
                using var srcMs = new MemoryStream(bytes);
                using var srcReader = new iText.Kernel.Pdf.PdfReader(srcMs);
                using var srcDoc = new iText.Kernel.Pdf.PdfDocument(srcReader);
                using var destMs = new MemoryStream();
                using (var writer = new iText.Kernel.Pdf.PdfWriter(destMs))
                using (var destDoc = new iText.Kernel.Pdf.PdfDocument(writer))
                {
                    srcDoc.CopyPagesTo(pageNumber, pageNumber, destDoc);
                }
                singlePageBytes = destMs.ToArray();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "iText failed to extract page {PageNumber}. Falling back to sending entire PDF bytes.", pageNumber);
                singlePageBytes = bytes;
            }

            // We query page 1 of our newly generated single-page PDF
            var pagePass = await AnalyzeAzureReadPdfAsync(singlePageBytes, endpoint, key, "1");
            if (!string.IsNullOrWhiteSpace(pagePass.errorMessage))
            {
                return (null, pagePass.errorMessage);
            }

            var page = pagePass.pages?.FirstOrDefault();
            if (page == null)
            {
                return (null, "No OCR layout returned for this page.");
            }

            page.PageNumber = pageNumber;
            return (page, null);
        }
        catch (Exception ex)
        {
            var fullError = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
            _logger.LogWarning(ex, "Azure Read OCR failed to extract PDF page {PageNumber}.", pageNumber);
            return (null, fullError);
        }
    }

    private async Task<(string? text, List<Services.DTOs.PageLinesDto>? pages, string? errorMessage)> ExtractPdfWithAzureReadLayoutAsync(byte[] bytes, int expectedPageCount = 0)
    {
        try
        {
            var endpoint = _config["AzureComputerVision:Endpoint"]?.Trim().TrimEnd('/')
                ?? throw new InvalidOperationException("AzureComputerVision:Endpoint is not configured.");
            var key = _config["AzureComputerVision:Key"]?.Trim()
                ?? throw new InvalidOperationException("AzureComputerVision:Key is not configured.");

            (string? text, List<Services.DTOs.PageLinesDto>? pages, string? errorMessage) firstPass = (null, null, null);
            
            // If the PDF is smaller than 5 MB, we can try to do a full OCR pass to save requests
            if (bytes.Length <= 5 * 1024 * 1024)
            {
                firstPass = await AnalyzeAzureReadPdfAsync(bytes, endpoint, key, null);
            }
            else
            {
                _logger.LogInformation("PDF is too large ({Length} bytes) for single-pass Azure Read API. Falling back to page-by-page extraction.", bytes.Length);
                firstPass = (string.Empty, new List<Services.DTOs.PageLinesDto>(), null);
            }

            if (!string.IsNullOrWhiteSpace(firstPass.errorMessage))
            {
                if (firstPass.errorMessage.Contains("InvalidImageSize") || firstPass.errorMessage.Contains("too large"))
                {
                    _logger.LogInformation("PDF returned InvalidImageSize. Falling back to page-by-page extraction.");
                    firstPass = (string.Empty, new List<Services.DTOs.PageLinesDto>(), null);
                }
                else
                {
                    return firstPass;
                }
            }

            var pages = firstPass.pages ?? new List<Services.DTOs.PageLinesDto>();
            if (expectedPageCount > 0)
            {
                var existingPages = pages.Select(p => p.PageNumber).ToHashSet();
                var missingPages = Enumerable.Range(1, expectedPageCount)
                    .Where(page => !existingPages.Contains(page))
                    .ToList();

                foreach (var missingPage in missingPages)
                {
                    // Sleep to avoid rate limits
                    await Task.Delay(3000);

                    byte[] singlePageBytes;
                    try
                    {
                        using var srcMs = new MemoryStream(bytes);
                        using var srcReader = new iText.Kernel.Pdf.PdfReader(srcMs);
                        using var srcDoc = new iText.Kernel.Pdf.PdfDocument(srcReader);
                        using var destMs = new MemoryStream();
                        using (var writer = new iText.Kernel.Pdf.PdfWriter(destMs))
                        using (var destDoc = new iText.Kernel.Pdf.PdfDocument(writer))
                        {
                            srcDoc.CopyPagesTo(missingPage, missingPage, destDoc);
                        }
                        singlePageBytes = destMs.ToArray();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "iText failed to extract page {PageNumber} for full OCR fallback. Falling back to sending entire PDF bytes.", missingPage);
                        singlePageBytes = bytes;
                    }

                    var pagePass = await AnalyzeAzureReadPdfAsync(singlePageBytes, endpoint, key, "1");
                    if (!string.IsNullOrWhiteSpace(pagePass.errorMessage))
                    {
                        _logger.LogWarning("Azure Read page {PageNumber} fallback failed: {Error}", missingPage, pagePass.errorMessage);
                        continue;
                    }

                    var pageResult = pagePass.pages?.FirstOrDefault();
                    if (pageResult == null) continue;
                    pageResult.PageNumber = missingPage;
                    pages.RemoveAll(p => p.PageNumber == missingPage);
                    pages.Add(pageResult);
                }
            }

            pages = pages
                .GroupBy(p => p.PageNumber)
                .Select(g => g.First())
                .OrderBy(p => p.PageNumber)
                .ToList();

            var text = string.Join(Environment.NewLine + Environment.NewLine, pages.SelectMany(p => p.Lines).Select(l => l.Text).Where(line => !string.IsNullOrWhiteSpace(line)));
            return (string.IsNullOrWhiteSpace(text) ? firstPass.text : text, pages, null);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Azure Read API request failed.");
            return (null, null, $"Azure Read API Error: {ex.Message}");
        }
        catch (Exception ex)
        {
            var fullError = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
            _logger.LogWarning(ex, "Azure Read OCR failed to extract PDF text.");
            return (null, null, fullError);
        }
    }

    private async Task<(string? text, List<Services.DTOs.PageLinesDto>? pages, string? errorMessage)> AnalyzeAzureReadPdfAsync(byte[] bytes, string endpoint, string key, string? pagesQuery)
    {
        var requestUrl = $"{endpoint}/vision/v3.2/read/analyze";
        if (!string.IsNullOrWhiteSpace(pagesQuery))
        {
            requestUrl += $"?pages={Uri.EscapeDataString(pagesQuery)}";
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, requestUrl);
        request.Headers.Add("Ocp-Apim-Subscription-Key", key);
        request.Content = new ByteArrayContent(bytes);
        request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");

        var response = await _httpClient.SendAsync(request);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Azure Read API error: {StatusCode} {Body}", response.StatusCode, responseBody);
            return (null, null, $"Azure Read API Error ({(int)response.StatusCode}): {responseBody}");
        }

        if (!response.Headers.TryGetValues("Operation-Location", out var locations))
        {
            return (null, null, "Azure Read API did not return an Operation-Location header.");
        }

        var operationUrl = locations.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(operationUrl))
        {
            return (null, null, "Azure Read API returned an empty Operation-Location header.");
        }

        for (var attempt = 0; attempt < 40; attempt++)
        {
            await Task.Delay(attempt < 8 ? 750 : 1500);

            using var pollRequest = new HttpRequestMessage(HttpMethod.Get, operationUrl);
            pollRequest.Headers.Add("Ocp-Apim-Subscription-Key", key);
            var pollResponse = await _httpClient.SendAsync(pollRequest);
            var pollBody = await pollResponse.Content.ReadAsStringAsync();

            if (!pollResponse.IsSuccessStatusCode)
            {
                _logger.LogWarning("Azure Read API polling error: {StatusCode} {Body}", pollResponse.StatusCode, pollBody);
                return (null, null, $"Azure Read polling error ({(int)pollResponse.StatusCode}): {pollBody}");
            }

            using var doc = JsonDocument.Parse(pollBody);
            var status = doc.RootElement.GetProperty("status").GetString();

            if (string.Equals(status, "failed", StringComparison.OrdinalIgnoreCase))
            {
                return (null, null, "Azure Read API failed to analyze the PDF.");
            }

            if (!string.Equals(status, "succeeded", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (!doc.RootElement.TryGetProperty("analyzeResult", out var analyzeResult)
                || !analyzeResult.TryGetProperty("readResults", out var readResults))
            {
                return (string.Empty, new List<Services.DTOs.PageLinesDto>(), null);
            }

            var textBuilder = new StringBuilder();
            var pagesDto = new List<Services.DTOs.PageLinesDto>();

            foreach (var page in readResults.EnumerateArray())
            {
                var pageDto = new Services.DTOs.PageLinesDto
                {
                    PageNumber = page.TryGetProperty("page", out var pageNumber) ? pageNumber.GetInt32() : pagesDto.Count + 1,
                    Width = page.TryGetProperty("width", out var width) ? width.GetDouble() : null,
                    Height = page.TryGetProperty("height", out var height) ? height.GetDouble() : null,
                    Unit = page.TryGetProperty("unit", out var unit) ? unit.GetString() ?? "pixel" : "pixel",
                    Angle = page.TryGetProperty("angle", out var angle) ? angle.GetDouble() : null
                };

                if (!page.TryGetProperty("lines", out var lines))
                {
                    pagesDto.Add(pageDto);
                    continue;
                }

                foreach (var line in lines.EnumerateArray())
                {
                    var lineText = line.TryGetProperty("text", out var textProp) ? textProp.GetString() ?? string.Empty : string.Empty;
                    if (!string.IsNullOrWhiteSpace(lineText)) textBuilder.AppendLine(lineText);

                    var lineDto = new Services.DTOs.OcrLineDto
                    {
                        Text = lineText,
                        BoundingBox = TryGetAzureReadBox(line)
                    };

                    if (line.TryGetProperty("words", out var words))
                    {
                        foreach (var word in words.EnumerateArray())
                        {
                            lineDto.Words.Add(new Services.DTOs.OcrWordDto
                            {
                                Text = word.TryGetProperty("text", out var wordText) ? wordText.GetString() ?? string.Empty : string.Empty,
                                BoundingBox = TryGetAzureReadBox(word)
                            });
                        }
                    }

                    pageDto.Lines.Add(lineDto);
                }

                pagesDto.Add(pageDto);
            }

            return (textBuilder.ToString().Trim(), pagesDto, null);
        }

        return (null, null, "Azure Read API timed out while analyzing the PDF.");
    }

    private static Services.DTOs.BoundingBoxDto? TryGetAzureReadBox(JsonElement element)
    {
        if (!element.TryGetProperty("boundingBox", out var box) || box.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        var values = box.EnumerateArray().Select(v => v.GetDouble()).ToArray();
        if (values.Length < 8) return null;

        var xs = new[] { values[0], values[2], values[4], values[6] };
        var ys = new[] { values[1], values[3], values[5], values[7] };
        var minX = xs.Min();
        var maxX = xs.Max();
        var minY = ys.Min();
        var maxY = ys.Max();

        return new Services.DTOs.BoundingBoxDto
        {
            X = minX,
            Y = minY,
            Width = maxX - minX,
            Height = maxY - minY
        };
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
            var pageDto = new Services.DTOs.PageLinesDto { PageNumber = 1, Unit = "pixel", Angle = 0 };

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
