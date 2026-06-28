using BusinessObjects.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Repositories;

public interface IChatRepository
{
    Task<List<ChatSession>> GetSessionsAsync(long userId);
    Task<ChatSession?> GetSessionByIdAsync(long sessionId);
    Task<List<ChatMessage>> GetMessagesAsync(long sessionId);
    Task<ChatSession> CreateSessionAsync(long userId, string title);
    Task<ChatMessage> AddMessageAsync(long sessionId, string role, string content);
    Task<bool> RenameSessionAsync(long sessionId, string title);
    Task<bool> TogglePinSessionAsync(long sessionId, bool pin);
    Task<bool> DeleteSessionAsync(long sessionId);
}
