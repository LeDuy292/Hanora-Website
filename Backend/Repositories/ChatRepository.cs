using BusinessObjects.Models;
using DataAccessObjects;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Repositories;

public class ChatRepository : IChatRepository
{
    private readonly AppDbContext _db;

    public ChatRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<ChatSession>> GetSessionsAsync(long userId)
    {
        return await _db.ChatSessions
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.IsPinned == true)
            .ThenByDescending(s => s.UpdatedAt ?? s.CreatedAt)
            .ToListAsync();
    }

    public async Task<ChatSession?> GetSessionByIdAsync(long sessionId)
    {
        return await _db.ChatSessions
            .Include(s => s.ChatMessages)
            .FirstOrDefaultAsync(s => s.Id == sessionId);
    }

    public async Task<List<ChatMessage>> GetMessagesAsync(long sessionId)
    {
        return await _db.ChatMessages
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();
    }

    public async Task<ChatSession> CreateSessionAsync(long userId, string title)
    {
        var session = new ChatSession
        {
            UserId = userId,
            Title = title,
            IsPinned = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.ChatSessions.Add(session);
        await _db.SaveChangesAsync();
        return session;
    }

    public async Task<ChatMessage> AddMessageAsync(long sessionId, string role, string content)
    {
        var message = new ChatMessage
        {
            SessionId = sessionId,
            Role = role,
            Content = content,
            CreatedAt = DateTime.UtcNow
        };
        _db.ChatMessages.Add(message);

        // Update the updated_at time of the parent session
        var session = await _db.ChatSessions.FindAsync(sessionId);
        if (session != null)
        {
            session.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return message;
    }

    public async Task<bool> RenameSessionAsync(long sessionId, string title)
    {
        var session = await _db.ChatSessions.FindAsync(sessionId);
        if (session == null) return false;

        session.Title = title;
        session.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> TogglePinSessionAsync(long sessionId, bool pin)
    {
        var session = await _db.ChatSessions.FindAsync(sessionId);
        if (session == null) return false;

        session.IsPinned = pin;
        session.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteSessionAsync(long sessionId)
    {
        var session = await _db.ChatSessions.FindAsync(sessionId);
        if (session == null) return false;

        _db.ChatSessions.Remove(session);
        await _db.SaveChangesAsync();
        return true;
    }
}
