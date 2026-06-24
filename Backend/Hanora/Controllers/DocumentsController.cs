using BusinessObjects.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Repositories;
using Services;
using System.Security.Claims;

namespace Hanora.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IDocumentProcessingService _documentProcessingService;
    private readonly IDocumentRepository _documentRepository;
    private readonly IS3StorageService _s3StorageService;

    public DocumentsController(
        IDocumentProcessingService documentProcessingService,
        IDocumentRepository documentRepository,
        IS3StorageService s3StorageService)
    {
        _documentProcessingService = documentProcessingService;
        _documentRepository = documentRepository;
        _s3StorageService = s3StorageService;
    }

    public class PresignedUrlRequestDto
    {
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
    }

    public class RegisterDocumentDto
    {
        public string FileUrl { get; set; } = string.Empty;
        public string OriginalFilename { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long FileSizeBytes { get; set; }
    }

    [HttpPost("presigned-url")]
    public async Task<IActionResult> GetPresignedUrl([FromBody] PresignedUrlRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.FileName) || string.IsNullOrWhiteSpace(request.ContentType))
        {
            return BadRequest("FileName and ContentType are required.");
        }

        var result = await _s3StorageService.GeneratePreSignedUrlAsync(request.FileName, request.ContentType);

        return Ok(new
        {
            PresignedUrl = result.PresignedUrl,
            FileUrl = result.FileUrl
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> RegisterDocument([FromBody] RegisterDocumentDto request)
    {
        if (string.IsNullOrWhiteSpace(request.FileUrl) || string.IsNullOrWhiteSpace(request.OriginalFilename))
        {
            return BadRequest("FileUrl and OriginalFilename are required.");
        }

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdString, out long userId))
        {
            userId = 1; 
        }

        var document = await _documentProcessingService.RegisterDocumentAsync(
            userId, 
            request.FileUrl, 
            request.OriginalFilename, 
            request.ContentType, 
            request.FileSizeBytes
        );

        return Ok(new
        {
            document.Id,
            document.Title,
            document.Status,
            Message = "Document registered and is being processed in the background."
        });
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadDocument(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("No file uploaded.");
        }

        const long MaxFileSize = 5 * 1024 * 1024; // 5 MB
        if (file.Length > MaxFileSize)
        {
            return BadRequest("File size exceeds the 5MB limit.");
        }

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdString, out long userId))
        {
            userId = 1; 
        }

        var document = await _documentProcessingService.ProcessUploadedFileAsync(userId, file);

        return Ok(new
        {
            document.Id,
            document.Title,
            document.Status,
            Message = "Document is being processed in the background."
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetDocument(long id)
    {
        var document = await _documentRepository.GetByIdAsync(id);
        if (document == null)
        {
            return NotFound();
        }

        return Ok(new
        {
            document.Id,
            document.Title,
            document.FileUrl,
            document.Status,
            document.ExtractedText
        });
    }

    [HttpGet("my-documents")]
    public async Task<IActionResult> GetMyDocuments()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdString, out long userId))
        {
            userId = 1; 
        }

        var documents = await _documentRepository.GetByUserIdAsync(userId);
        var result = documents.Select(d => new
        {
            d.Id,
            d.Title,
            d.Status,
            d.CreatedAt
        });

        return Ok(result);
    }
}
