using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DataAccessObjects;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Linq;

namespace Hanora.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        
        long userId = long.Parse(userIdClaim.Value);
        var notifications = await _db.UserNotifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new
            {
                n.Id,
                n.Title,
                n.Message,
                n.IsRead,
                createdAt = n.CreatedAt
            })
            .ToListAsync();

        return Ok(notifications);
    }

    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkAsRead(long id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        
        long userId = long.Parse(userIdClaim.Value);
        var notification = await _db.UserNotifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (notification == null)
        {
            return NotFound("Notification not found.");
        }

        notification.IsRead = true;
        _db.UserNotifications.Update(notification);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Marked as read successfully." });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();
        
        long userId = long.Parse(userIdClaim.Value);
        var unreadNotifications = await _db.UserNotifications
            .Where(n => n.UserId == userId && n.IsRead == false)
            .ToListAsync();

        foreach (var notification in unreadNotifications)
        {
            notification.IsRead = true;
            _db.UserNotifications.Update(notification);
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "All notifications marked as read." });
    }
}
