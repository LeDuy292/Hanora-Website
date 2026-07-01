using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Services;
using Services.DTOs;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Hanora.Hubs;

[Authorize]
public class CommunityHub : Hub
{
    private readonly ICommunityService _communityService;

    public CommunityHub(ICommunityService communityService)
    {
        _communityService = communityService;
    }

    public async Task SendMessage(string content)
    {
        var userIdStr = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (long.TryParse(userIdStr, out long userId))
        {
            var savedMessage = await _communityService.SendMessageAsync(userId, content);
            
            // Broadcast the message to all clients
            await Clients.All.SendAsync("ReceiveMessage", savedMessage);
        }
    }
}
