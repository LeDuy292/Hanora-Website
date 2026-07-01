namespace Services;

public interface IOcrService
{
    Task<(string? Text, List<Services.DTOs.PageLinesDto>? Pages, string? ErrorMessage)> ExtractLayoutAsync(Stream fileStream, string fileName, string contentType);
}
