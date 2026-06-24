using BusinessObjects.Models;
using JiebaNet.Segmenter;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Repositories;
using System.Text.Json;

namespace Services;

public interface IDocumentProcessingService
{
    Task<Document> ProcessUploadedFileAsync(long userId, IFormFile file);
    Task<Document> RegisterDocumentAsync(long userId, string fileUrl, string originalFilename, string contentType, long fileSizeBytes);
}

public class DocumentProcessingService : IDocumentProcessingService
{
    private readonly IBackgroundTaskQueue _taskQueue;
    private readonly IS3StorageService _s3StorageService;
    private readonly IDocumentRepository _documentRepository;
    private readonly ILogger<DocumentProcessingService> _logger;

    public DocumentProcessingService(
        IBackgroundTaskQueue taskQueue,
        IS3StorageService s3StorageService,
        IDocumentRepository documentRepository,
        ILogger<DocumentProcessingService> logger)
    {
        _taskQueue = taskQueue;
        _s3StorageService = s3StorageService;
        _documentRepository = documentRepository;
        _logger = logger;
    }

    public async Task<Document> ProcessUploadedFileAsync(long userId, IFormFile file)
    {
        var fileUrl = await _s3StorageService.UploadFileAsync(file);

        var document = new Document
        {
            UserId = userId,
            Title = Path.GetFileNameWithoutExtension(file.FileName),
            OriginalFilename = file.FileName,
            FileUrl = fileUrl,
            FileSizeBytes = file.Length,
            Status = DocumentStatus.Processing,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        document = await _documentRepository.CreateAsync(document);

        var docId = document.Id;
        var fileName = file.FileName;
        var contentType = file.ContentType;

        await _taskQueue.QueueBackgroundWorkItemAsync(async (serviceProvider, token) =>
        {
            await ProcessDocumentBackgroundAsync(docId, fileUrl, fileName, contentType, serviceProvider, token);
        });

        return document;
    }

    public async Task<Document> RegisterDocumentAsync(long userId, string fileUrl, string originalFilename, string contentType, long fileSizeBytes)
    {
        var document = new Document
        {
            UserId = userId,
            Title = Path.GetFileNameWithoutExtension(originalFilename),
            OriginalFilename = originalFilename,
            FileUrl = fileUrl,
            FileSizeBytes = fileSizeBytes,
            Status = DocumentStatus.Processing,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        document = await _documentRepository.CreateAsync(document);

        var docId = document.Id;

        await _taskQueue.QueueBackgroundWorkItemAsync(async (serviceProvider, token) =>
        {
            await ProcessDocumentBackgroundAsync(docId, fileUrl, originalFilename, contentType, serviceProvider, token);
        });

        return document;
    }

    private async Task ProcessDocumentBackgroundAsync(
        long documentId, 
        string fileUrl, 
        string fileName, 
        string contentType,
        IServiceProvider serviceProvider, 
        CancellationToken token)
    {
        _logger.LogInformation("Background processing started for Document {DocId}", documentId);

        var docRepo = serviceProvider.GetRequiredService<IDocumentRepository>();
        var s3Service = serviceProvider.GetRequiredService<IS3StorageService>();
        var ocrService = serviceProvider.GetRequiredService<IOcrService>();

        var doc = await docRepo.GetByIdAsync(documentId);
        if (doc == null) return;

        try
        {
            using var fileStream = await s3Service.DownloadFileAsync(fileUrl);
            
            var (extractedText, generatedPdfBytes, errorMessage) = await ocrService.ExtractTextAndPdfAsync(fileStream, fileName, contentType);

            if (!string.IsNullOrEmpty(errorMessage))
            {
                doc.Status = DocumentStatus.Failed;
                doc.ExtractedText = errorMessage;
            }
            else
            {
                if (generatedPdfBytes != null)
                {
                    var newPdfUrl = await s3Service.UploadBytesAsync(generatedPdfBytes, fileName, "application/pdf");
                    doc.FileUrl = newPdfUrl;
                    
                    if (!doc.Title.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                    {
                        doc.Title += ".pdf";
                    }
                    if (!doc.OriginalFilename.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
                    {
                        doc.OriginalFilename += ".pdf";
                    }
                }

                if (!string.IsNullOrWhiteSpace(extractedText))
                {
                    var segmenter = new JiebaSegmenter();
                    var segments = segmenter.Cut(extractedText);
                    
                    doc.ExtractedText = JsonSerializer.Serialize(segments);
                }

                doc.Status = DocumentStatus.Ready;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process document {DocId}", documentId);
            doc.Status = DocumentStatus.Failed;
            doc.ExtractedText = "Đã xảy ra lỗi không xác định khi xử lý tài liệu.";
        }

        doc.UpdatedAt = DateTime.UtcNow;
        await docRepo.UpdateAsync(doc);
    }
}
