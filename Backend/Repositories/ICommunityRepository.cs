using BusinessObjects.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Repositories;

public interface ICommunityRepository
{
    Task<CommunityChannel?> GetChannelByIdAsync(long channelId);
    Task<CommunityChannel> CreateChannelAsync(CommunityChannel channel);
    Task<CommunityChannel?> GetDefaultGlobalChannelAsync();
    Task<CommunityMessage> AddMessageAsync(CommunityMessage message);
    Task<List<CommunityMessage>> GetRecentMessagesAsync(long channelId, int limit = 50);
}
