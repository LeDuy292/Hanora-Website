using System.Collections.Generic;
using System.Threading.Tasks;
using Services.DTOs;

namespace Services;

public interface ICommunityService
{
    Task<CommunityMessageDto> SendMessageAsync(long userId, string content, long? channelId = null);
    Task<List<CommunityMessageDto>> GetRecentMessagesAsync(long? channelId = null, int limit = 50);
    Task<long> GetOrCreateGlobalChannelAsync(long adminUserId);
}
