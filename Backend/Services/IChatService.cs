using BusinessObjects.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Services;

public interface IChatService
{
    Task<List<ChatSession>> GetSessionsAsync(long userId);
    Task<List<ChatMessage>> GetMessagesAsync(long sessionId);
    Task<ChatSession> CreateSessionAsync(long userId, string? title);
    Task<ChatMessage> SendMessageAsync(long userId, long sessionId, string content, string? activeDocContext);
    Task<bool> RenameSessionAsync(long sessionId, string title);
    Task<bool> TogglePinSessionAsync(long sessionId, bool pin);
    Task<bool> DeleteSessionAsync(long sessionId);
}
