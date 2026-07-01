using BusinessObjects.Models;
using Repositories;
using Services.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Services;

public class CommunityService : ICommunityService
{
    private readonly ICommunityRepository _communityRepository;
    private readonly IUserRepository _userRepository;

    public CommunityService(ICommunityRepository communityRepository, IUserRepository userRepository)
    {
        _communityRepository = communityRepository;
        _userRepository = userRepository;
    }

    public async Task<long> GetOrCreateGlobalChannelAsync(long adminUserId)
    {
        var channel = await _communityRepository.GetDefaultGlobalChannelAsync();
        if (channel != null)
        {
            return channel.Id;
        }

        // Create it
        var newChannel = new CommunityChannel
        {
            Name = "Global",
            Description = "Phòng chat chung cho tất cả mọi người",
            ChannelType = ChannelType.Public,
            CreatedBy = adminUserId,
            CreatedAt = DateTime.UtcNow
        };
        
        var created = await _communityRepository.CreateChannelAsync(newChannel);
        return created.Id;
    }

    public async Task<CommunityMessageDto> SendMessageAsync(long userId, string content, long? channelId = null)
    {
        long targetChannelId = channelId ?? await GetOrCreateGlobalChannelAsync(userId);
        
        var msg = new CommunityMessage
        {
            ChannelId = targetChannelId,
            SenderId = userId,
            Content = content,
            CreatedAt = DateTime.UtcNow
        };

        var savedMsg = await _communityRepository.AddMessageAsync(msg);
        return CommunityMessageDto.FromEntity(savedMsg);
    }

    public async Task<List<CommunityMessageDto>> GetRecentMessagesAsync(long? channelId = null, int limit = 50)
    {
        // For MVP, if channelId is null, we assume they want the Global channel
        long targetChannelId = channelId ?? 1; // 1 as fallback
        
        if (channelId == null)
        {
            var globalChannel = await _communityRepository.GetDefaultGlobalChannelAsync();
            if (globalChannel != null)
            {
                targetChannelId = globalChannel.Id;
            }
        }

        var messages = await _communityRepository.GetRecentMessagesAsync(targetChannelId, limit);
        return messages.Select(CommunityMessageDto.FromEntity).ToList();
    }
}
