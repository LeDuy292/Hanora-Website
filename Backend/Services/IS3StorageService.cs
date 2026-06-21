using Microsoft.AspNetCore.Http;

namespace Services;

public interface IS3StorageService
{
    Task<string> UploadFileAsync(IFormFile file, string folderPath = "Hanora");
    Task<Stream> DownloadFileAsync(string fileUrl);
}
