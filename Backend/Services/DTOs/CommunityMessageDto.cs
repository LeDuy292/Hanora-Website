using System;
using BusinessObjects.Models;

namespace Services.DTOs;

public class CommunityMessageDto
{
    public long Id { get; set; }
    public long ChannelId { get; set; }
    public long SenderId { get; set; }
    public string SenderName { get; set; } = null!;
    public string? SenderAvatarUrl { get; set; }
    public string Content { get; set; } = null!;
    public DateTime? CreatedAt { get; set; }
    
    public static CommunityMessageDto FromEntity(CommunityMessage msg)
    {
        return new CommunityMessageDto
        {
            Id = msg.Id,
            ChannelId = msg.ChannelId,
            SenderId = msg.SenderId,
            SenderName = msg.Sender?.DisplayName ?? msg.Sender?.Username ?? "Unknown",
            SenderAvatarUrl = msg.Sender?.AvatarUrl,
            Content = msg.Content,
            CreatedAt = msg.CreatedAt
        };
    }
}
