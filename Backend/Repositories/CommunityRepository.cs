using BusinessObjects.Models;
using DataAccessObjects;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Repositories;

public class CommunityRepository : ICommunityRepository
{
    private readonly AppDbContext _context;

    public CommunityRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<CommunityChannel?> GetChannelByIdAsync(long channelId)
    {
        return await _context.CommunityChannels.FirstOrDefaultAsync(c => c.Id == channelId);
    }

    public async Task<CommunityChannel> CreateChannelAsync(CommunityChannel channel)
    {
        _context.CommunityChannels.Add(channel);
        await _context.SaveChangesAsync();
        return channel;
    }

    public async Task<CommunityChannel?> GetDefaultGlobalChannelAsync()
    {
        // For MVP, we use the first public channel as the global chat
        return await _context.CommunityChannels
            .FirstOrDefaultAsync(c => c.Name == "Global" && c.ChannelType == ChannelType.Public);
    }

    public async Task<CommunityMessage> AddMessageAsync(CommunityMessage message)
    {
        _context.CommunityMessages.Add(message);
        await _context.SaveChangesAsync();
        
        // Reload with Sender info
        await _context.Entry(message).Reference(m => m.Sender).LoadAsync();
        return message;
    }

    public async Task<List<CommunityMessage>> GetRecentMessagesAsync(long channelId, int limit = 50)
    {
        return await _context.CommunityMessages
            .Include(m => m.Sender)
            .Where(m => m.ChannelId == channelId && m.IsDeleted != true)
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit)
            .OrderBy(m => m.CreatedAt) // Return in chronological order
            .ToListAsync();
    }
}
