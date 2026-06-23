using Microsoft.AspNetCore.Http;

namespace Services;

public interface IS3StorageService
{
    Task<string> UploadFileAsync(IFormFile file, string folderPath = "Hanora");
    Task<Stream> DownloadFileAsync(string fileUrl);
    Task<(string PresignedUrl, string FileUrl)> GeneratePreSignedUrlAsync(string fileName, string contentType, string folderPath = "Hanora");
    Task<string> UploadBytesAsync(byte[] bytes, string fileName, string contentType, string folderPath = "Hanora");
}
