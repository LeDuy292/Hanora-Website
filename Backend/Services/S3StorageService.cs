using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace Services;

public class S3StorageService : IS3StorageService
{
    private readonly string _bucketName;
    private readonly AmazonS3Client _s3Client;

    public S3StorageService(IConfiguration config)
    {
        _bucketName = config["AWS:BucketName"] ?? "projectswp1";
        var accessKey = config["AWS:AccessKey"];
        var secretKey = config["AWS:SecretKey"];
        var region = Amazon.RegionEndpoint.GetBySystemName(config["AWS:Region"] ?? "ap-southeast-2");
        
        _s3Client = new AmazonS3Client(accessKey, secretKey, region);
    }

    public async Task<string> UploadFileAsync(IFormFile file, string folderPath = "Hanora")
    {
        var fileExtension = Path.GetExtension(file.FileName);
        var uniqueFileName = $"{Guid.NewGuid()}{fileExtension}";
        var key = string.IsNullOrEmpty(folderPath) ? uniqueFileName : $"{folderPath.TrimEnd('/')}/{uniqueFileName}";

        using var newMemoryStream = new MemoryStream();
        await file.CopyToAsync(newMemoryStream);

        var uploadRequest = new TransferUtilityUploadRequest
        {
            InputStream = newMemoryStream,
            Key = key,
            BucketName = _bucketName,
            ContentType = file.ContentType
        };

        var fileTransferUtility = new TransferUtility(_s3Client);
        await fileTransferUtility.UploadAsync(uploadRequest);

        return $"https://{_bucketName}.s3.{_s3Client.Config.RegionEndpoint.SystemName}.amazonaws.com/{key}";
    }

    public async Task<Stream> DownloadFileAsync(string fileUrl)
    {
        var uri = new Uri(fileUrl);
        var key = uri.AbsolutePath.TrimStart('/');

        var request = new GetObjectRequest
        {
            BucketName = _bucketName,
            Key = key
        };

        var response = await _s3Client.GetObjectAsync(request);
        return response.ResponseStream;
    }
}
