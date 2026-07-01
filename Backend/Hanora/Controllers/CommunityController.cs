using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services;
using Services.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Hanora.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class CommunityController : ControllerBase
{
    private readonly ICommunityService _communityService;

    public CommunityController(ICommunityService communityService)
    {
        _communityService = communityService;
    }

    [HttpGet("messages")]
    public async Task<ActionResult<List<CommunityMessageDto>>> GetRecentMessages()
    {
        var messages = await _communityService.GetRecentMessagesAsync();
        return Ok(messages);
    }
}
