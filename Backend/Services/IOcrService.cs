namespace Services;

public interface IOcrService
{
    Task<string> ExtractTextAsync(Stream fileStream, string fileName, string contentType);
}
