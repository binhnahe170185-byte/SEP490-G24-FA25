using System.Security.Claims;
using FJAP.DTOs;
using FJAP.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FJAP.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet("recent")]
    public async Task<IActionResult> GetRecent([FromQuery] int take = 20, [FromQuery] DateTime? since = null)
    {
        var userId = GetCurrentUserId();

        var notifications = await _notificationService.GetRecentAsync(new NotificationFilterRequest(
            userId,
            take,
            since?.ToUniversalTime()
        ));

        return Ok(new
        {
            code = 200,
            message = "Success",
            data = notifications
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNotificationRequest request)
    {
        if (request.UserId <= 0)
        {
            return BadRequest(new { code = 400, message = "UserId must be provided." });
        }

        var createdBy = GetCurrentUserIdOrNull();
        var notification = await _notificationService.CreateAsync(request with { CreatedBy = createdBy });

        return CreatedAtAction(nameof(GetRecent), new { take = 1 }, new
        {
            code = 201,
            message = "Notification created successfully",
            data = notification
        });
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("uid")
            ?? User.FindFirstValue("user_id");

        if (!string.IsNullOrWhiteSpace(userIdClaim) && int.TryParse(userIdClaim, out var id))
        {
            return id;
        }

        throw new InvalidOperationException("Cannot resolve current user id from token.");
    }

    private int? GetCurrentUserIdOrNull()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("uid")
            ?? User.FindFirstValue("user_id");

        return int.TryParse(userIdClaim, out var id) ? id : null;
    }
}


