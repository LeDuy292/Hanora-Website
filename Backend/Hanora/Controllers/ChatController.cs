using BusinessObjects.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Hanora.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;

    public ChatController(IChatService chatService)
    {
        _chatService = chatService;
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var userId))
        {
            return Unauthorized();
        }

        var sessions = await _chatService.GetSessionsAsync(userId);
        var dtos = sessions.Select(s => new ChatSessionDto
        {
            Id = s.Id,
            Title = s.Title,
            IsPinned = s.IsPinned ?? false,
            CreatedAt = s.CreatedAt ?? DateTime.UtcNow,
            UpdatedAt = s.UpdatedAt ?? DateTime.UtcNow
        });

        return Ok(dtos);
    }

    [HttpGet("sessions/{id}/messages")]
    public async Task<IActionResult> GetMessages(long id)
    {
        var messages = await _chatService.GetMessagesAsync(id);
        var dtos = messages.Select(m => new ChatMessageDto
        {
            Id = m.Id,
            SessionId = m.SessionId,
            Role = m.Role,
            Content = m.Content,
            CreatedAt = m.CreatedAt ?? DateTime.UtcNow
        });

        return Ok(dtos);
    }

    [HttpPost("sessions")]
    public async Task<IActionResult> CreateSession([FromBody] CreateSessionRequest request)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var userId))
        {
            return Unauthorized();
        }

        var session = await _chatService.CreateSessionAsync(userId, request.Title);
        var dto = new ChatSessionDto
        {
            Id = session.Id,
            Title = session.Title,
            IsPinned = session.IsPinned ?? false,
            CreatedAt = session.CreatedAt ?? DateTime.UtcNow,
            UpdatedAt = session.UpdatedAt ?? DateTime.UtcNow
        };

        return Ok(dto);
    }

    [HttpPost("sessions/{id}/message")]
    public async Task<IActionResult> SendMessage(long id, [FromBody] SendMessageRequest request)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !long.TryParse(userIdString, out var userId))
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest("Message content cannot be empty.");
        }

        var modelMsg = await _chatService.SendMessageAsync(userId, id, request.Content, request.ActiveDocContext);
        var dto = new ChatMessageDto
        {
            Id = modelMsg.Id,
            SessionId = modelMsg.SessionId,
            Role = modelMsg.Role,
            Content = modelMsg.Content,
            CreatedAt = modelMsg.CreatedAt ?? DateTime.UtcNow
        };

        return Ok(dto);
    }

    [HttpPut("sessions/{id}/title")]
    public async Task<IActionResult> RenameSession(long id, [FromBody] RenameSessionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest("Title cannot be empty.");
        }

        var success = await _chatService.RenameSessionAsync(id, request.Title);
        if (!success) return NotFound("Chat session not found.");

        return Ok();
    }

    [HttpPut("sessions/{id}/pin")]
    public async Task<IActionResult> TogglePinSession(long id, [FromBody] PinSessionRequest request)
    {
        var success = await _chatService.TogglePinSessionAsync(id, request.IsPinned);
        if (!success) return NotFound("Chat session not found.");

        return Ok();
    }

    [HttpDelete("sessions/{id}")]
    public async Task<IActionResult> DeleteSession(long id)
    {
        var success = await _chatService.DeleteSessionAsync(id);
        if (!success) return NotFound("Chat session not found.");

        return Ok();
    }
}

// ---- DTO classes ----

public class ChatSessionDto
{
    public long Id { get; set; }
    public string Title { get; set; } = null!;
    public bool IsPinned { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ChatMessageDto
{
    public long Id { get; set; }
    public long SessionId { get; set; }
    public string Role { get; set; } = null!;
    public string Content { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}

public class CreateSessionRequest
{
    public string? Title { get; set; }
}

public class SendMessageRequest
{
    public string Content { get; set; } = null!;
    public string? ActiveDocContext { get; set; }
}

public class RenameSessionRequest
{
    public string Title { get; set; } = null!;
}

public class PinSessionRequest
{
    public bool IsPinned { get; set; }
}
