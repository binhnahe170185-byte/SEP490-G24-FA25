using System.Security.Claims;
using FJAP.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace FJAP.Hubs;

[Authorize]
public class NotificationHub : Hub<INotificationClient>
{
    private static string GetUserGroup(string userId) => $"user:{userId}";

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? Context.User?.FindFirstValue("sub")
                     ?? Context.User?.FindFirstValue("uid")
                     ?? Context.User?.FindFirstValue("user_id");

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GetUserGroup(userId));
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? Context.User?.FindFirstValue("sub")
                     ?? Context.User?.FindFirstValue("uid")
                     ?? Context.User?.FindFirstValue("user_id");

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetUserGroup(userId));
        }

        await base.OnDisconnectedAsync(exception);
    }
}

public interface INotificationClient
{
    Task ReceiveNotification(NotificationDto notification);
    Task ReceiveNotifications(IEnumerable<NotificationDto> notifications);
}


