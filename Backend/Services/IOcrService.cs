namespace Services;

public interface IOcrService
{
    Task<(string? ExtractedText, byte[]? GeneratedPdfBytes, string? ErrorMessage)> ExtractTextAndPdfAsync(Stream fileStream, string fileName, string contentType);
}
