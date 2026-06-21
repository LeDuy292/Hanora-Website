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
            
            var extractedText = await ocrService.ExtractTextAsync(fileStream, fileName, contentType);

            if (!string.IsNullOrWhiteSpace(extractedText))
            {
                var segmenter = new JiebaSegmenter();
                var segments = segmenter.Cut(extractedText);
                
                doc.ExtractedText = JsonSerializer.Serialize(segments);
            }

            doc.Status = DocumentStatus.Ready;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process document {DocId}", documentId);
            doc.Status = DocumentStatus.Failed;
        }

        doc.UpdatedAt = DateTime.UtcNow;
        await docRepo.UpdateAsync(doc);
    }
}
